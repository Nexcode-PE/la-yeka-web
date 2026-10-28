import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  CircleDollarSign,
  ChartNoAxesCombined,
  ChevronRight,
  ExternalLink,
  Filter,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
} from 'lucide-react';
import './styles.css';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
  category: { name: string } | null;
};
type Category = { id: string; name: string; position: number };
type Order = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  status: string;
  createdAt: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'CASH' | 'YAPE';
  address: string | null;
  district: string | null;
  items: Array<{ productName: string; quantity: number }>;
};
type Claim = {
  id: string;
  customerName: string;
  email: string;
  kind: string;
  detail: string;
  status: string;
  createdAt: string;
};
type Dashboard = { salesToday: number; ordersToday: number; pending: number; totalProducts: number; availableProducts: number; recentOrders: Order[]; paymentBreakdown: Record<string, number> };
type View = 'dashboard' | 'products' | 'orders' | 'claims';
const api = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
const brandLogo = '/images/logo-la-yeka-v2.png';
const labels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  CANCELLED: 'Cancelado',
  RECEIVED: 'Recibido',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  COMPLAINT: 'Reclamo',
  SERVICE_ISSUE: 'Queja',
  DELIVERY: 'Delivery',
  PICKUP: 'Recojo en local',
  CASH: 'Efectivo',
  YAPE: 'Yape',
};
const statusOptions = {
  orders: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'CANCELLED'],
  claims: ['RECEIVED', 'IN_REVIEW', 'RESOLVED'],
};

function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('la-yeka-admin-token') || '');
  const [user, setUser] = useState(() => sessionStorage.getItem('la-yeka-admin-user') || '');
  const [view, setView] = useState<View>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'paused'>('all');
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!api) throw new Error('Configura VITE_API_URL para conectar la administración.');
      const response = await fetch(`${api}/api${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo completar la operación.');
      }
      return response.json();
    },
    [token],
  );
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (view === 'dashboard') setDashboard(await request('/admin/dashboard'));
      if (view === 'products') {
        const [productData, categoryData] = await Promise.all([request('/admin/products'), request('/admin/categories')]);
        setProducts(productData); setCategories(categoryData);
      }
      if (view === 'orders') setOrders(await request('/admin/orders'));
      if (view === 'claims') setClaims(await request('/admin/claims'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con la API.');
    } finally {
      setLoading(false);
    }
  }, [request, token, view]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setDraftPrices(Object.fromEntries(products.map((product) => [product.id, product.price])));
  }, [products]);
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const session = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') }),
      });
      if (session.user.role !== 'ADMIN')
        throw new Error('Esta cuenta no tiene permisos administrativos.');
      sessionStorage.setItem('la-yeka-admin-token', session.token);
      sessionStorage.setItem('la-yeka-admin-user', session.user.name || session.user.email);
      setToken(session.token);
      setUser(session.user.name || session.user.email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    }
  };
  const logout = () => {
    sessionStorage.removeItem('la-yeka-admin-token');
    sessionStorage.removeItem('la-yeka-admin-user');
    setToken('');
    setUser('');
  };
  const update = async (kind: 'products' | 'orders' | 'claims', id: string, data: object) => {
    setSavingId(id);
    try {
      await request(`/admin/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSavingId('');
    }
  };
  const available = useMemo(
    () => products.filter((product) => product.isAvailable).length,
    [products],
  );
  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query || `${product.name} ${product.description || ''}`.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === 'all' || product.category?.name === categoryFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' ? product.isAvailable : !product.isAvailable);
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [availabilityFilter, categoryFilter, productQuery, products]);
  const operationColumns = useMemo(() => [
    { title: 'Nuevos', statuses: ['PENDING'], tone: 'border-amber-400' },
    { title: 'En cocina', statuses: ['CONFIRMED', 'PREPARING'], tone: 'border-orange-400' },
    { title: 'Listos / entrega', statuses: ['READY'], tone: 'border-emerald-400' },
  ].map((column) => ({ ...column, orders: orders.filter((order) => column.statuses.includes(order.status)) })), [orders]);
  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      await request('/admin/products', { method: 'POST', body: JSON.stringify({
        name: fields.get('name'), description: fields.get('description') || null,
        price: Number(fields.get('price')), categoryId: fields.get('categoryId') || null,
        imagePath: fields.get('imagePath') || null, isAvailable: true,
      }) });
      setShowProductForm(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el producto.'); }
  };
  const openWhatsApp = (order: Order) => {
    const phone = order.customerPhone?.replace(/\D/g, '');
    if (!phone) return setError('El pedido no tiene un número de celular válido.');
    const normalized = phone.startsWith('51') ? phone : `51${phone}`;
    const message = `Hola ${order.customerName || ''}, te escribimos de La Yeka por tu pedido #${order.id.slice(0, 8).toUpperCase()}.%0A%0A${order.items.map((item) => `${item.quantity}× ${item.productName}`).join('%0A')}%0A%0ATotal: S/ ${Number(order.total).toFixed(2)}%0AEstado: ${labels[order.status]}.`;
    window.open(`https://wa.me/${normalized}?text=${message}`, '_blank', 'noopener,noreferrer');
  };
  if (!token)
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-stone-950 px-5 py-10 text-stone-950 before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-amber-400">
        <div className="pointer-events-none absolute -left-20 -top-28 size-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-orange-600/15 blur-3xl" />
        <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-stone-50 p-8 shadow-2xl shadow-black/40 sm:p-10">
          <div className="-mx-8 -mt-8 mb-8 flex h-28 items-center justify-center bg-stone-950 sm:-mx-10 sm:-mt-10">
            <img src={brandLogo} alt="La Yeka" className="h-20 w-auto object-contain" />
          </div>
          <div className="mb-7 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400"><ShieldCheck size={22} /></div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-700">LA YEKA · ADMIN</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Panel de operación</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Gestiona catálogo, pedidos y solicitudes de clientes.
          </p>
          <form className="mt-8 grid gap-4" onSubmit={login}>
            <label className="grid gap-2 text-sm font-bold">
              Correo administrativo
              <input
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none ring-amber-400 focus:ring-2"
                name="email"
                type="email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Contraseña
              <input
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none ring-amber-400 focus:ring-2"
                name="password"
                type="password"
                minLength={10}
                required
              />
            </label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button
              className="mt-2 rounded-xl bg-stone-950 px-4 py-3 font-bold text-white hover:bg-amber-500 hover:text-stone-950"
              type="submit"
            >
              Ingresar al panel
            </button>
          </form>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-stone-950">
      <header className="sticky top-0 z-30 border-b border-amber-400/30 bg-stone-950 text-white shadow-xl shadow-black/20">
        <div className="flex min-h-20 w-full items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 px-2 sm:h-16 sm:w-24">
              <img src={brandLogo} alt="La Yeka" className="max-h-14 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-amber-400 sm:text-xs">LA YEKA · ADMINISTRACIÓN</p>
              <h1 className="mt-1 text-base font-black sm:text-xl">Hola, {user}</h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-2 text-sm font-bold hover:border-amber-400"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>
      <div className="grid w-full gap-0 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 bg-white px-4 py-4 xl:min-h-[calc(100vh-5rem)] xl:border-b-0 xl:border-r xl:px-5 xl:py-7">
          <div className="mb-5 hidden px-3 xl:block">
            <p className="text-xs font-black tracking-[0.18em] text-stone-400">MÓDULOS</p>
          </div>
          <nav className="grid gap-1">
            {(
              [
                { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
                { id: 'products', label: 'Catálogo', icon: Package },
                { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
                { id: 'claims', label: 'Reclamos', icon: ClipboardList },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${view === id ? 'bg-amber-400 text-stone-950 shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 xl:px-12">
          {error && (
            <p className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <TriangleAlert size={18} />
              {error}
            </p>
          )}
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-amber-700">OPERACIÓN</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {view === 'products'
                  ? 'Catálogo'
                  : view === 'dashboard'
                    ? 'Resumen de operación'
                    : view === 'orders'
                    ? 'Pedidos'
                    : 'Libro de reclamaciones'}
              </h2>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-500 hover:text-stone-950 disabled:cursor-wait"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Actualizando…' : 'Actualizar datos'}
            </button>
          </div>
          {view === 'dashboard' && dashboard && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat value={`S/ ${dashboard.salesToday.toFixed(2)}`} label="Ventas de hoy" />
                <Stat value={dashboard.ordersToday} label="Pedidos de hoy" tone="green" />
                <Stat value={dashboard.pending} label="Por atender" tone="amber" />
                <Stat value={`${dashboard.availableProducts}/${dashboard.totalProducts}`} label="Productos activos" tone="gray" />
              </div>
              <div className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div><p className="font-black">Actividad reciente</p><p className="text-sm text-stone-500">Últimos pedidos recibidos</p></div>
                  <button onClick={() => setView('orders')} className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-stone-950">Ver pedidos <ChevronRight size={16}/></button>
                </div>
                {dashboard.recentOrders.length ? dashboard.recentOrders.map((order) => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 last:border-0"><div><p className="font-bold">{order.customerName || 'Cliente sin nombre'} <span className="font-mono text-xs text-stone-400">#{order.id.slice(0,8)}</span></p><p className="text-sm text-stone-500">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</p></div><div className="text-right"><p className="font-black">S/ {Number(order.total).toFixed(2)}</p><p className="text-xs font-bold text-amber-700">{labels[order.status]}</p></div></article>) : <Empty text="Todavía no hay pedidos para mostrar." />}
              </div>
              <div className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><p className="font-black">Caja de hoy</p><p className="mt-1 text-sm text-stone-500">Ventas confirmadas por medio de pago.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(dashboard.paymentBreakdown).map(([method, total]) => <div key={method} className="rounded-xl bg-stone-50 p-4"><p className="text-xs font-bold text-stone-500">{labels[method]}</p><p className="mt-1 text-xl font-black">S/ {total.toFixed(2)}</p></div>)}</div></div>
            </>
          )}
          {view === 'products' && (
            <>
              <div className="mb-5 flex justify-end"><button onClick={() => setShowProductForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-stone-950 hover:bg-amber-500"><Plus size={17}/> Nuevo producto</button></div>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Stat value={products.length} label="Productos registrados" />
                <Stat value={available} label="A la venta" tone="green" />
                <Stat value={products.length - available} label="Pausados" tone="gray" />
              </div>
              <div className="mb-5 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white" placeholder="Buscar por producto o ingrediente" />
                </label>
                <label className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-amber-400">
                    <option value="all">Todas las categorías</option>
                    {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </label>
                <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as 'all' | 'available' | 'paused')} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-400">
                  <option value="all">Todo el estado</option>
                  <option value="available">Disponibles</option>
                  <option value="paused">Pausados</option>
                </select>
              </div>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="hidden grid-cols-[minmax(0,1fr)_11rem_10rem] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs font-black tracking-[0.13em] text-stone-400 md:grid">
                  <span>PRODUCTO</span><span>PRECIO</span><span>ESTADO</span>
                </div>
                {filteredProducts.map((product) => (
                  <article
                    className="grid gap-4 border-b border-stone-100 p-5 transition last:border-0 hover:bg-amber-50/30 md:grid-cols-[minmax(0,1fr)_11rem_10rem] md:items-center"
                    key={product.id}
                  >
                    <div>
                      <p className="font-black">{product.name}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        <span className="font-semibold text-amber-700">{product.category?.name || 'Sin categoría'}</span> · {product.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign size={17} className="text-stone-500" />
                      <input
                        className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-bold outline-none focus:border-amber-400"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={draftPrices[product.id] ?? product.price}
                        onChange={(event) => setDraftPrices((current) => ({ ...current, [product.id]: event.target.value }))}
                      />
                      {Number(draftPrices[product.id] ?? product.price) !== Number(product.price) && <button onClick={() => update('products', product.id, { price: Number(draftPrices[product.id]) })} disabled={savingId === product.id} className="rounded-lg bg-amber-400 px-2.5 py-2 text-xs font-black text-stone-950 hover:bg-amber-500">Guardar</button>}
                    </div>
                    <button
                      onClick={() =>
                        update('products', product.id, { isAvailable: !product.isAvailable })
                      }
                      disabled={savingId === product.id}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${product.isAvailable ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}`}
                    >
                      {product.isAvailable ? 'Disponible' : 'Pausado'}
                    </button>
                  </article>
                ))}
                {filteredProducts.length === 0 && <Empty text="No encontramos productos con esos filtros." />}
              </div>
            </>
          )}
          {view === 'orders' && (
            <div className="grid gap-4 xl:grid-cols-3">
              {orders.length === 0 ? (
                <div className="xl:col-span-3"><Empty text="Aún no hay pedidos registrados." /></div>
              ) : (
                operationColumns.map((column) => <section key={column.title} className={`rounded-2xl border-t-4 ${column.tone} bg-stone-100/70 p-3`}><div className="mb-3 flex items-center justify-between px-2"><h3 className="font-black">{column.title}</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-bold">{column.orders.length}</span></div><div className="grid gap-3">{column.orders.map((order) => (
                  <article className="rounded-xl bg-white p-4 shadow-sm" key={order.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">
                          {order.customerName || 'Cliente sin nombre'} · S/{' '}
                          {Number(order.total).toFixed(2)}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {order.customerPhone} ·{' '}
                          {new Date(order.createdAt).toLocaleString('es-PE')}
                        </p>
                        <p className="mt-2 text-xs font-bold text-amber-700">{labels[order.fulfillment]} · {labels[order.paymentMethod]}</p>
                        {order.fulfillment === 'DELIVERY' && <p className="mt-1 text-xs text-stone-500">{order.address} · {order.district}</p>}
                        <p className="mt-3 text-sm">
                          {order.items
                            .map((item) => `${item.quantity}× ${item.productName}`)
                            .join(', ')}
                        </p>
                      </div>
                      <Status
                        value={order.status}
                        options={statusOptions.orders}
                        onChange={(status) => update('orders', order.id, { status })}
                      />
                      <button onClick={() => openWhatsApp(order)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"><ExternalLink size={15}/> WhatsApp</button>
                    </div>
                  </article>
                ))}{column.orders.length === 0 && <p className="rounded-xl bg-white/70 p-5 text-center text-sm text-stone-400">Sin pedidos</p>}</div></section>)
              )}
            </div>
          )}
          {view === 'claims' && (
            <div className="grid gap-4">
              {claims.length === 0 ? (
                <Empty text="Aún no hay reclamos ni quejas." />
              ) : (
                claims.map((claim) => (
                  <article className="rounded-2xl bg-white p-5 shadow-sm" key={claim.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">
                          {claim.customerName} · {labels[claim.kind]}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {claim.email} · {new Date(claim.createdAt).toLocaleDateString('es-PE')}
                        </p>
                        <p className="mt-3 text-sm leading-6">{claim.detail}</p>
                      </div>
                      <Status
                        value={claim.status}
                        options={statusOptions.claims}
                        onChange={(status) => update('claims', claim.id, { status })}
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
          {showProductForm && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
              <form onSubmit={createProduct} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-amber-700">CATÁLOGO</p><h3 className="mt-1 text-2xl font-black">Nuevo producto</h3></div><button type="button" onClick={() => setShowProductForm(false)} className="rounded-lg px-3 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100">Cerrar</button></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-bold sm:col-span-2">Nombre<input name="name" required minLength={2} className="rounded-xl border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label>
                  <label className="grid gap-1 text-sm font-bold">Precio (S/)<input name="price" required type="number" min="0.1" step="0.1" className="rounded-xl border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label>
                  <label className="grid gap-1 text-sm font-bold">Categoría<select name="categoryId" className="rounded-xl border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-amber-400"><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label className="grid gap-1 text-sm font-bold sm:col-span-2">Descripción<textarea name="description" rows={3} className="resize-none rounded-xl border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label>
                  <label className="grid gap-1 text-sm font-bold sm:col-span-2">URL de imagen (opcional)<input name="imagePath" type="url" placeholder="https://…" className="rounded-xl border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label>
                </div>
                <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowProductForm(false)} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-stone-100">Cancelar</button><button className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black hover:bg-amber-500">Crear producto</button></div>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
function Stat({ value, label, tone = 'amber' }: { value: number | string; label: string; tone?: 'amber' | 'green' | 'gray' }) {
  const accents = {
    amber: 'bg-amber-400',
    green: 'bg-emerald-400',
    gray: 'bg-stone-300',
  };
  return (
    <article className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${accents[tone]}`} />
      <strong className="block text-4xl font-black">{value}</strong>
      <span className="mt-1 block text-sm text-stone-500">{label}</span>
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center text-stone-500 shadow-sm">{text}</div>
  );
}
function Status({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
createRoot(document.getElementById('root')!).render(<Admin />);
