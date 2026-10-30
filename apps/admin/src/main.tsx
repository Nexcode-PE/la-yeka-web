import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  CircleDollarSign,
  Menu,
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  ExternalLink,
  Filter,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import './styles.css';

type Product = {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  price: string;
  isAvailable: boolean;
  category: { id: string; name: string } | null;
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [notice, setNotice] = useState('');
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
      if (response.status === 204) return null;
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
      setNotice('Cambios guardados correctamente.');
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
  const uploadProductImage = async (file: File) => {
    const form = new FormData();
    form.append('image', file);
    const response = await fetch(`${api}/api/admin/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'No se pudo subir la imagen.');
    }
    return response.json() as Promise<{ url: string }>;
  };
  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSavingProduct(true); setError('');
    try {
      const data = {
        name: fields.get('name'), description: fields.get('description') || null,
        price: Number(fields.get('price')), categoryId: fields.get('categoryId') || null,
        isAvailable: fields.get('isAvailable') === 'on',
      };
      const product = editingProduct
        ? await request(`/admin/products/${editingProduct.id}`, { method: 'PATCH', body: JSON.stringify(data) })
        : await request('/admin/products', { method: 'POST', body: JSON.stringify(data) });
      if (productImage) {
        const { url } = await uploadProductImage(productImage);
        await request(`/admin/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ imagePath: url }) });
      }
      setShowProductForm(false); setEditingProduct(null); setProductImage(null); await load();
      setNotice(editingProduct ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el producto.'); }
    finally { setSavingProduct(false); }
  };
  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    setSavingId(product.id); setError('');
    try { await request(`/admin/products/${product.id}`, { method: 'DELETE' }); await load(); setNotice('Producto eliminado correctamente.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el producto.'); }
    finally { setSavingId(''); }
  };
  const openProductForm = (product: Product | null = null) => {
    setEditingProduct(product); setProductImage(null); setShowProductForm(true);
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
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-10 text-slate-950 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[#4169ff]">
        <div className="pointer-events-none absolute -left-20 -top-28 size-80 rounded-full bg-[#4169ff]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-blue-500/10 blur-3xl" />
        <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white p-7 shadow-2xl shadow-black/30 sm:p-9">
          <div className="-mx-7 -mt-7 mb-7 flex h-24 items-center justify-center bg-slate-950 sm:-mx-9 sm:-mt-9">
            <img src={brandLogo} alt="La Yeka" className="h-20 w-auto object-contain" />
          </div>
          <div className="mb-7 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4169ff]"><ShieldCheck size={22} /></div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#4169ff]">LA YEKA · ADMIN</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de operación</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Gestiona catálogo, pedidos y solicitudes de clientes.
          </p>
          <form className="mt-8 grid gap-4" onSubmit={login}>
            <label className="grid gap-2 text-sm font-bold">
              Correo administrativo
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none ring-[#4169ff] focus:ring-2"
                name="email"
                type="email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Contraseña
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none ring-[#4169ff] focus:ring-2"
                name="password"
                type="password"
                minLength={10}
                required
              />
            </label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button
              className="mt-2 h-11 rounded-lg bg-[#4169ff] px-4 font-semibold text-white transition hover:bg-[#3156d8]"
              type="submit"
            >
              Ingresar al panel
            </button>
          </form>
        </section>
      </main>
    );
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#f7f8fc] font-sans text-slate-950">
      <header className="sticky top-0 z-40 border-b border-amber-400/35 bg-[#101010] text-white shadow-[0_5px_18px_rgba(0,0,0,0.22)]">
        <div className="relative flex h-[68px] w-full items-center justify-between gap-3 px-4 sm:px-6">
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-400/70 via-amber-200/20 to-transparent" />
          <div className="flex items-center gap-3 sm:gap-4">
            <button aria-label="Abrir navegación" onClick={() => setSidebarOpen(true)} className="grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10 xl:hidden"><Menu size={21}/></button>
            <div className="hidden h-11 w-14 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 bg-[#1d1d1d] px-1 shadow-inner shadow-black/40 sm:flex">
              <img src={brandLogo} alt="La Yeka" className="max-h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-300 sm:text-xs">LA YEKA · ADMINISTRACIÓN</p>
              <h1 className="mt-0.5 text-sm font-semibold text-white sm:text-[15px]">Hola, {user}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2"><button aria-label="Notificaciones" title="No hay notificaciones" className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-400/10"><Bell size={18}/></button><button onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/45 bg-amber-400 px-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300"><LogOut size={16} /><span className="hidden sm:inline">Salir</span></button></div>
        </div>
      </header>
      {sidebarOpen && <button aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 xl:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-200 xl:top-[68px] xl:z-30 xl:h-[calc(100vh-68px)] xl:translate-x-0 xl:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCompact ? 'xl:w-20' : 'xl:w-60'}`}>
          <div className="mb-6 flex items-center justify-between px-2 xl:hidden"><img src={brandLogo} alt="La Yeka" className="h-10 w-auto"/><button aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><X size={20}/></button></div>
          <div className="mb-4 hidden items-center justify-between px-2 xl:flex">
            {!sidebarCompact && <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">OPERACIÓN</p>}
            <button aria-label="Contraer menú" onClick={() => setSidebarCompact((value) => !value)} className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100">{sidebarCompact ? <Menu size={18}/> : <Menu size={18}/>}</button>
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
                onClick={() => { setView(id); setSidebarOpen(false); }}
                title={sidebarCompact ? label : undefined}
                aria-label={label}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${view === id ? 'bg-[#eef2ff] text-[#4169ff]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'} ${sidebarCompact ? 'justify-center xl:px-0' : ''}`}
              >
                <Icon size={18} />
                <span className={sidebarCompact ? 'xl:hidden' : ''}>{label}</span>
              </button>
            ))}
          </nav>
      </aside>
      <section className={`flex h-[calc(100dvh-68px)] min-w-0 flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 xl:pb-8 ${view === 'products' ? 'overflow-hidden' : 'overflow-y-auto'} ${sidebarCompact ? 'xl:ml-20' : 'xl:ml-60'}`}>
          {error && (
            <p role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <TriangleAlert size={18} />
              {error}
            </p>
          )}
          {notice && <div role="status" className="mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-[#eef2ff] px-4 py-3 text-sm font-medium text-[#3156d8]"><span>{notice}</span><button aria-label="Cerrar aviso" onClick={() => setNotice('')} className="rounded p-1 hover:bg-white"><X size={16}/></button></div>}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">OPERACIÓN</p>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
                {view === 'products'
                  ? 'Catálogo'
                  : view === 'dashboard'
                    ? 'Resumen de operación'
                    : view === 'orders'
                    ? 'Pedidos'
                    : 'Libro de reclamaciones'}
              </h2>
            </div>
            <div className="flex items-center gap-2"><button onClick={load} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Actualizando…' : 'Actualizar datos'}
            </button>{view === 'products' && <button onClick={() => openProductForm()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4169ff] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3156d8]"><Plus size={16}/> Nuevo producto</button>}</div>
          </div>
          {loading && !dashboard && view === 'dashboard' && <DashboardSkeleton />}
          {view === 'dashboard' && dashboard && !loading && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat value={`S/ ${dashboard.salesToday.toFixed(2)}`} label="Ventas de hoy" />
                <Stat value={dashboard.ordersToday} label="Pedidos de hoy" tone="green" />
                <Stat value={dashboard.pending} label="Por atender" tone="amber" />
                <Stat value={`${dashboard.availableProducts}/${dashboard.totalProducts}`} label="Productos activos" tone="gray" />
              </div>
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div><p className="font-black">Actividad reciente</p><p className="text-sm text-stone-500">Últimos pedidos recibidos</p></div>
                  <button onClick={() => setView('orders')} className="inline-flex items-center gap-1 text-sm font-semibold text-[#4169ff] hover:text-[#274ccf]">Ver pedidos <ChevronRight size={16}/></button>
                </div>
                {dashboard.recentOrders.length ? dashboard.recentOrders.map((order) => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 last:border-0"><div><p className="font-bold">{order.customerName || 'Cliente sin nombre'} <span className="font-mono text-xs text-stone-400">#{order.id.slice(0,8)}</span></p><p className="text-sm text-stone-500">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</p></div><div className="text-right"><p className="font-black">S/ {Number(order.total).toFixed(2)}</p><p className="text-xs font-bold text-amber-700">{labels[order.status]}</p></div></article>) : <Empty text="Todavía no hay pedidos para mostrar." />}
              </div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30"><p className="font-bold">Caja de hoy</p><p className="mt-1 text-sm text-slate-500">Ventas confirmadas por medio de pago.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(dashboard.paymentBreakdown).map(([method, total]) => <div key={method} className="rounded-lg border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">{labels[method]}</p><p className="mt-1 text-xl font-bold">S/ {total.toFixed(2)}</p></div>)}</div></div>
            </>
          )}
          {view === 'products' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <Stat compact value={products.length} label="Productos registrados" />
                <Stat compact value={available} label="A la venta" tone="green" />
                <Stat compact value={products.length - available} label="Pausados" tone="gray" />
              </div>
              <div className="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/30 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
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
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/30 sm:p-4">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(205px,1fr))] gap-4">
                {filteredProducts.map((product) => (
                  <article
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 transition duration-200 hover:border-[#aebdff] hover:shadow-md hover:shadow-blue-100/70"
                    key={product.id}
                  >
                    <div className="relative grid aspect-[1.35/0.9] place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                      {product.imagePath ? <img src={product.imagePath} alt={product.name} className="size-full object-cover transition duration-200 group-hover:scale-[1.03]" /> : <UtensilsCrossed size={30} />}
                      <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold ${product.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.isAvailable ? 'Disponible' : 'Pausado'}</span>
                    </div>
                    <div className="px-1 pb-1 pt-3">
                      <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                      <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-slate-500">
                        <span className="font-semibold text-[#4169ff]">{product.category?.name || 'Sin categoría'}</span>{product.description ? ` · ${product.description}` : ''}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-slate-950">S/ {Number(product.price).toFixed(2)}</span>
                        <button onClick={() => update('products', product.id, { isAvailable: !product.isAvailable })} disabled={savingId === product.id} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${product.isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{product.isAvailable ? 'Pausar' : 'Activar'}</button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <input
                        aria-label={`Precio de ${product.name}`}
                        className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold outline-none ring-[#4169ff] focus:bg-white focus:ring-2"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={draftPrices[product.id] ?? product.price}
                        onChange={(event) => setDraftPrices((current) => ({ ...current, [product.id]: event.target.value }))}
                      />
                      {Number(draftPrices[product.id] ?? product.price) !== Number(product.price) && <button title="Guardar precio" onClick={() => update('products', product.id, { price: Number(draftPrices[product.id]) })} disabled={savingId === product.id} className="h-8 rounded-md bg-[#4169ff] px-2 text-xs font-semibold text-white hover:bg-[#3156d8]">Guardar</button>}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button onClick={() => openProductForm(product)} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#aebdff] hover:bg-[#eef2ff]"><Pencil size={13}/> Editar</button>
                        <button onClick={() => deleteProduct(product)} disabled={savingId === product.id} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13}/> Eliminar</button>
                      </div>
                    </div>
                  </article>
                ))}
                </div>
                {filteredProducts.length === 0 && <Empty text="No encontramos productos con esos filtros." />}
              </div>
            </div>
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
            <div role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
              <form key={editingProduct?.id || 'new'} onSubmit={saveProduct} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">CATÁLOGO</p><h3 id="product-dialog-title" className="mt-1 text-xl font-bold">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3></div><button type="button" aria-label="Cerrar" onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Nombre<input name="name" defaultValue={editingProduct?.name} required minLength={2} className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2" /></label>
                  <label className="grid gap-1.5 text-sm font-semibold">Precio (S/)<input name="price" defaultValue={editingProduct?.price} required type="number" min="0.1" step="0.1" className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2" /></label>
                  <label className="grid gap-1.5 text-sm font-semibold">Categoría<select name="categoryId" defaultValue={editingProduct?.category?.id || ''} className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Descripción<textarea name="description" defaultValue={editingProduct?.description || ''} rows={3} className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none ring-[#4169ff] focus:ring-2" /></label>
                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">Imagen del producto
                    <span className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 font-normal text-slate-600"><Upload size={18} className="text-[#4169ff]"/><input aria-label="Archivo de imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProductImage(event.target.files?.[0] || null)} className="min-w-0 text-sm" /></span>
                    <span className="text-xs font-normal text-slate-500">JPG, PNG o WEBP; máximo 4 MB. {productImage ? `Seleccionada: ${productImage.name}` : editingProduct?.imagePath ? 'Conservará la imagen actual si no eliges otra.' : 'Si no cargas una, se mostrará el ícono predeterminado.'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="isAvailable" type="checkbox" defaultChecked={editingProduct ? editingProduct.isAvailable : true} className="size-4 accent-[#4169ff]" /> Disponible para la venta</label>
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={savingProduct} className="h-10 rounded-lg bg-[#4169ff] px-5 text-sm font-semibold text-white hover:bg-[#3156d8] disabled:opacity-60">{savingProduct ? 'Guardando…' : editingProduct ? 'Guardar cambios' : 'Crear producto'}</button></div>
              </form>
            </div>
          )}
      </section>
      <nav aria-label="Navegación principal móvil" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] xl:hidden">
        {([
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'products', label: 'Catálogo', icon: Package },
          { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
          { id: 'claims', label: 'Reclamos', icon: ClipboardList },
        ] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`grid min-h-14 place-items-center gap-0.5 rounded-lg py-1 text-[10px] font-semibold ${view === id ? 'text-[#4169ff]' : 'text-slate-500'}`}><Icon size={19}/>{label}</button>)}
      </nav>
    </main>
  );
}
function Stat({ value, label, tone = 'amber', compact = false }: { value: number | string; label: string; tone?: 'amber' | 'green' | 'gray'; compact?: boolean }) {
  const accents = {
    amber: 'bg-[#4169ff]',
    green: 'bg-emerald-500',
    gray: 'bg-slate-300',
  };
  return (
    <article className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 ${compact ? 'p-3' : 'p-5'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accents[tone]}`} />
      <strong className={`block font-bold tracking-tight ${compact ? 'text-2xl' : 'text-3xl'}`}>{value}</strong>
      <span className={`block text-slate-500 ${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>{label}</span>
    </article>
  );
}
function DashboardSkeleton() {
  return <div className="animate-pulse"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white" />)}</div><div className="mt-6 h-56 rounded-xl border border-slate-200 bg-white" /></div>;
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm shadow-slate-200/30">{text}</div>
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
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-[#4169ff] focus:ring-2"
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
