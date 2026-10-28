import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  LogOut,
  Package,
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
type Order = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  status: string;
  createdAt: string;
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
type View = 'products' | 'orders' | 'claims';
const api = import.meta.env.VITE_API_URL || '';
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
};
const statusOptions = {
  orders: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'CANCELLED'],
  claims: ['RECEIVED', 'IN_REVIEW', 'RESOLVED'],
};

function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('la-yeka-admin-token') || '');
  const [user, setUser] = useState(() => sessionStorage.getItem('la-yeka-admin-user') || '');
  const [view, setView] = useState<View>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      if (view === 'products') setProducts(await request('/admin/products'));
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
    try {
      await request(`/admin/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    }
  };
  const available = useMemo(
    () => products.filter((product) => product.isAvailable).length,
    [products],
  );
  if (!token)
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 px-5 py-10 text-stone-950">
        <section className="w-full max-w-md rounded-[2rem] bg-stone-50 p-8 shadow-2xl sm:p-10">
          <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-amber-400">
            <ShieldCheck />
          </div>
          <p className="text-xs font-black tracking-[0.2em] text-amber-700">LA YEKA · ADMIN</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Panel de operación</h1>
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
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <header className="border-b border-stone-800 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-400">
              LA YEKA · ADMINISTRACIÓN
            </p>
            <h1 className="text-xl font-black">Hola, {user}</h1>
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
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[15rem_1fr]">
        <aside className="rounded-2xl bg-white p-3 shadow-sm">
          <nav className="grid gap-1">
            {(
              [
                { id: 'products', label: 'Catálogo', icon: Package },
                { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
                { id: 'claims', label: 'Reclamos', icon: ClipboardList },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold ${view === id ? 'bg-amber-400 text-stone-950' : 'hover:bg-stone-100'}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <section>
          {error && (
            <p className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <TriangleAlert size={18} />
              {error}
            </p>
          )}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-amber-700">OPERACIÓN</p>
              <h2 className="mt-1 text-3xl font-black">
                {view === 'products'
                  ? 'Catálogo'
                  : view === 'orders'
                    ? 'Pedidos'
                    : 'Libro de reclamaciones'}
              </h2>
            </div>
            <button
              onClick={load}
              className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 hover:text-stone-950"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
          {view === 'products' && (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Stat value={products.length} label="Productos" />
                <Stat value={available} label="Disponibles" />
                <Stat value={products.length - available} label="Pausados" />
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {products.map((product) => (
                  <article
                    className="grid gap-3 border-b border-stone-100 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                    key={product.id}
                  >
                    <div>
                      <p className="font-black">{product.name}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {product.category?.name} · {product.description || 'Sin descripción'}
                      </p>
                    </div>
                    <label className="text-sm font-bold">
                      S/{' '}
                      <input
                        className="ml-1 w-20 rounded-lg border border-stone-300 px-2 py-1"
                        type="number"
                        min="0.1"
                        step="0.1"
                        defaultValue={Number(product.price)}
                        onBlur={(event) => {
                          const price = Number(event.currentTarget.value);
                          if (price > 0 && price !== Number(product.price))
                            update('products', product.id, { price });
                        }}
                      />
                    </label>
                    <button
                      onClick={() =>
                        update('products', product.id, { isAvailable: !product.isAvailable })
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${product.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}
                    >
                      {product.isAvailable ? 'Disponible' : 'Pausado'}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {view === 'orders' && (
            <div className="grid gap-4">
              {orders.length === 0 ? (
                <Empty text="Aún no hay pedidos registrados." />
              ) : (
                orders.map((order) => (
                  <article className="rounded-2xl bg-white p-5 shadow-sm" key={order.id}>
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
                    </div>
                  </article>
                ))
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
        </section>
      </div>
    </main>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <strong className="block text-4xl font-black">{value}</strong>
      <span className="text-sm text-stone-500">{label}</span>
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
