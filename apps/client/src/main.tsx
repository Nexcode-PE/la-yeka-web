import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUp, Check, ChevronRight, Flame, LogIn, MapPin, Minus, Plus, ShoppingBag, Star, Trash2, UserRound, X } from 'lucide-react';
import './tailwind.css';

type Product = { id?: string; name: string; detail: string; price: number; category: string; tag?: string };
type CartItem = Product & { qty: number };
type OrderHistory = { id: string; total: string; status: string; createdAt: string; items: Array<{ productName: string; quantity: number }> };

const extras = [
  { name: 'Jamón', price: 2 },
  { name: 'Queso', price: 3 },
  { name: 'Huevo', price: 3 },
  { name: 'Tocino', price: 3 },
  { name: 'Plátano', price: 3 },
  { name: 'Piña', price: 3 },
];
const featuredNames = ['La Yekaburger Full', 'La Mixta Full', 'Fileteada Hawaiana', 'Salchiyeka Full'];
const money = (n: number) => `S/ ${n.toFixed(2)}`;
const wa = import.meta.env.VITE_WHATSAPP_NUMBER || '51974121550';
// En producción, la API se publica en el mismo dominio bajo /api.
const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');
const productVisual = (product: Product) => {
  if (product.category === 'Salchipapas') return '/images/salchipapas-3d.png';
  if (product.name === 'Coca-Cola 500 ml') return '/images/coca-cola-500ml.png';
  if (product.name === 'Inca Kola 500 ml') return '/images/inca-kola-500ml.png';
  return '/images/burger-3d.png';
};

function App() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState('Todo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [dialog, setDialog] = useState<'terms' | 'privacy' | 'claims' | 'account' | null>(null);
  const [claimSent, setClaimSent] = useState(false);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('login');
  const [accountName, setAccountName] = useState(() => sessionStorage.getItem('la-yeka-user-name') || '');
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('la-yeka-user-token') || '');
  const [authError, setAuthError] = useState('');
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [cartNotice, setCartNotice] = useState('');
  const cartNoticeTimeout = useRef<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const base = apiBase;
    if (base === null) { setCatalogState('error'); return; }
    fetch(base + '/api/catalog')
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((categories) => {
        const next = categories.flatMap((category: { name: string; products: Array<{ id:string; name:string; description:string; price:string; isFeatured?:boolean }> }) => category.products.map((product) => ({ id: product.id, name: product.name, detail: product.description || '', price: Number(product.price), category: category.name, tag: product.isFeatured ? 'Favorita' : undefined })));
        setCatalog(next); setCatalogState('ready');
      })
      .catch(() => setCatalogState('error'));
  }, [])
  useEffect(() => { const base = apiBase; if (base === null || !authToken) return; const headers = { Authorization: 'Bearer ' + authToken }; Promise.all([fetch(base + '/api/auth/me', { headers }), fetch(base + '/api/orders/me', { headers })]).then(async ([profile, orders]) => { if (!profile.ok || !orders.ok) throw new Error(); const { user } = await profile.json(); setAccountName(user.name || user.email); setOrderHistory(await orders.json()); }).catch(() => { sessionStorage.removeItem('la-yeka-user-token'); sessionStorage.removeItem('la-yeka-user-name'); setAuthToken(''); setAccountName(''); setOrderHistory([]); }); }, [authToken])
  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY > 400);
    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTopVisibility);
  }, []);
  const shown = useMemo(() => active === 'Todo' ? catalog : catalog.filter((p) => p.category === active), [active, catalog]);
  const categories = useMemo(() => ['Todo', ...Array.from(new Set(catalog.map((product) => product.category)))], [catalog]);
  const topPicks = useMemo(() => catalog.filter((product) => featuredNames.includes(product.name)), [catalog]);
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const add = (p: Product) => {
    setCart((c) => {
      const current = c.find((x) => x.name === p.name);
      return current
        ? c.map((x) => (x.name === p.name ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { ...p, qty: 1 }];
    });
    setCartNotice(`${p.name} agregado al carrito`);
    if (cartNoticeTimeout.current !== null) window.clearTimeout(cartNoticeTimeout.current);
    cartNoticeTimeout.current = window.setTimeout(() => setCartNotice(''), 2500);
  };
  useEffect(() => () => {
    if (cartNoticeTimeout.current !== null) window.clearTimeout(cartNoticeTimeout.current);
  }, []);
  const change = (name: string, d: number) =>
    setCart((c) =>
      c.flatMap((x) =>
        x.name === name && x.qty + d === 0 ? [] : x.name === name ? { ...x, qty: x.qty + d } : x,
      ),
    );
  const remove = (name: string) => setCart((c) => c.filter((x) => x.name !== name));
  const send = async () => {
    if (!cart.length) return;
    if (!customerName.trim() || !customerPhone.trim()) return;
    setSending(true);
    const api = apiBase;
    let orderId = '';
    try {
      if (api !== null && cart.every((item) => item.id)) {
        const response = await fetch(api + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: JSON.stringify({ customerName, customerPhone, notes: note, items: cart.map((item) => ({ productId: item.id, quantity: item.qty })) }) });
        if (!response.ok) throw new Error('No fue posible registrar el pedido');
        orderId = (await response.json()).id;
      }
    } catch (error) { alert(error instanceof Error ? error.message : 'Error al registrar el pedido'); setSending(false); return; }
    const lines = cart.map((x) => `• ${x.qty}x ${x.name} — ${money(x.price * x.qty)}`).join('\n');
    const text = `¡Hola, La Yeka! Quiero hacer este pedido:${orderId ? `%0AOrden: ${orderId}` : ''}%0A%0A${encodeURIComponent(lines)}%0A%0ATotal: ${encodeURIComponent(money(total))}${note ? `%0AIndicaciones: ${encodeURIComponent(note)}` : ''}`;
    window.open(`https://wa.me/${wa}?text=${text}`, '_blank');
    setSending(false);
  };
  const submitClaim = async (form: HTMLFormElement) => {
    const api = apiBase;
    if (api === null) return alert('El Libro de Reclamaciones estará disponible al conectar la API.');
    const data = new FormData(form);
    const response = await fetch(api + '/api/claims', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(data)) });
    if (!response.ok) return alert('No se pudo registrar tu solicitud.');
    setClaimSent(true);
  };
  const submitAccount = async (form: HTMLFormElement) => {
    const api = apiBase;
    if (api === null) { setAuthError('La autenticación estará disponible cuando se conecte la API.'); return; }
    setAuthError('');
    const data = new FormData(form);
    const payload = { name: data.get('name'), email: data.get('email'), password: data.get('password') };
    const endpoint = accountMode === 'login' ? 'login' : 'register';
    const response = await fetch(api + '/api/auth/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountMode === 'login' ? { email: payload.email, password: payload.password } : payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setAuthError(body.error || 'No se pudo completar la operación.'); return; }
    sessionStorage.setItem('la-yeka-user-token', body.token);
    sessionStorage.setItem('la-yeka-user-name', body.user.name || body.user.email);
    setAuthToken(body.token); setAccountName(body.user.name || body.user.email); setDialog(null);
  };
  return (
    <>
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-yeka-gold/30 bg-yeka-ink px-4 md:h-[88px] md:px-[7vw]">
        <a className="brand" href="#inicio" aria-label="La Yeka">
          <img
            src="/images/logo-la-yeka-v2.png"
            alt="La Yeka - ¡Con todititas las cremas! - Chincha Perú"
          />
        </a>
        <nav className="hidden gap-8 text-white md:flex">
          <a href="#carta">Carta</a>
          <a href="#extras">Complementos</a>
          <a href="#nosotros">Nosotros</a>
        </nav>
        <div className="header-actions flex items-center gap-2">
          <button className="account-button" onClick={() => { setAuthError(''); setDialog('account'); }}>
            {accountName ? <><UserRound size={17} /><span>{accountName.split(' ')[0]}</span></> : <><LogIn size={17} /><span>Iniciar sesión</span></>}
          </button>
          <button className="cart-button" onClick={() => setOpen(true)}>
            <ShoppingBag size={18} />
            <b>{count}</b> Mi pedido
          </button>
        </div>
      </header>
      <main id="inicio">
        <section className="hero min-h-[510px] px-5 py-14 md:min-h-[690px] md:px-[10vw]">
          <div className="hero-copy max-w-2xl">
            <p className="eyebrow">
              <Flame size={15} /> SABOR SIN DISCUSSIONES
            </p>
            <h1>
              Esto no es una hamburguesa.
              <br />
              <em>Es La Yeka.</em>
            </h1>
            <p className="lead">
              La carta más achorada de Chincha Alta, recién hecha para dejarte con ganas de volver.
            </p>
            <a className="primary" href="#carta">
              Ver la carta <ChevronRight size={19} />
            </a>
            <div className="hero-meta">
              <span>
                <strong>+30</strong> opciones yeka
              </span>
              <span>
                <strong>100%</strong> sabor
              </span>
            </div>
          </div>
        </section>
        <section className="delivery-banner">
          <div>
            <span className="delivery-dot" />
            <b>Pedidos rápidos por WhatsApp</b>
            <p>Confirma tu zona y recibe tu pedido en Chincha Alta.</p>
          </div>
          <button onClick={() => setOpen(true)}>
            Armar mi pedido <ChevronRight size={17} />
          </button>
        </section>
        {topPicks.length > 0 && <section className="featured">
          <div className="section-head">
            <div>
              <p className="eyebrow">LOS FAVORITOS DE LA CASA</p>
              <h2>Las más pedidas</h2>
            </div>
            <button
              className="text-link"
              onClick={() => document.getElementById('carta')?.scrollIntoView()}
            >
              Ver toda la carta <ChevronRight size={17} />
            </button>
          </div>
          <div className="featured-grid">
            {topPicks.map((p) => (
              <article key={p.name} className="featured-card">
                <img src={productVisual(p)} alt={`${p.name}, presentación referencial`} />
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.detail}</p>
                  <div>
                    <strong>{money(p.price)}</strong>
                    <button onClick={() => add(p)}>
                      Agregar <Plus size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>}
        <section className="intro" id="nosotros">
          <p className="eyebrow">DIRECTO DESDE CHINCHA ALTA</p>
          <h2>Sin poses. Con bastante queso.</h2>
          <p>
            Preparamos cada pedido con ganas: panes doraditos, carne al punto y esa combinación de
            ingredientes que se siente como premio.
          </p>
        </section>
        <section className="menu-section" id="carta">
          <div className="section-head">
            <div>
              <p className="eyebrow">ELIGE TU ANTOJO</p>
              <h2>La carta yeka</h2>
            </div>
            <p>Todos nuestros sánguches llevan verduritas frescas y papas fritas o al hilo.</p>
          </div>
          <div className="filters">
            {categories.map((c) => (
              <button
                className={active === c ? 'selected' : ''}
                onClick={() => setActive(c)}
                key={c}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid">
            {shown.map((p, i) => (
              <article className={'product p' + (i % 5)} key={p.name}>
                {p.tag && <label>{p.tag}</label>}
                <div className={`product-art ${p.category === 'Bebidas' ? 'drink-art' : ''}`}>
                  {productVisual(p) ? (
                    <img src={productVisual(p)!} alt={`${p.name}, presentación referencial`} />
                  ) : (
                    <span aria-label="Producto">🍔</span>
                  )}
                </div>
                <div className="product-info">
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.detail}</p>
                  </div>
                  <div className="card-bottom">
                    <strong>{money(p.price)}</strong>
                    <button aria-label={`Agregar ${p.name}`} onClick={() => add(p)}>
                      <Plus size={19} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {catalogState === 'loading' && <p className="col-span-full py-12 text-center text-stone-500">Cargando la carta…</p>}
            {catalogState === 'error' && <p className="col-span-full py-12 text-center text-stone-500">No pudimos cargar la carta. Inténtalo nuevamente en unos minutos.</p>}
            {catalogState === 'ready' && shown.length === 0 && <p className="col-span-full py-12 text-center text-stone-500">Por ahora no hay productos disponibles en esta categoría.</p>}
          </div>
        </section>
        <section className="extras" id="extras">
          <div>
            <p className="eyebrow">HAZLO MÁS YEKA</p>
            <h2>Complementos</h2>
            <p>Agrégale lo que quieras. Porque más queso nunca fue mala idea.</p>
          </div>
          <div className="extra-list">
            {extras.map((x) => (
              <button
                key={x.name}
                onClick={() =>
                  add({ ...x, detail: 'Extra para tu pedido', category: 'Complemento' })
                }
              >
                <span>{x.name}</span>
                <b>+ {money(x.price)}</b>
                <Plus size={17} />
              </button>
            ))}
          </div>
        </section>
        <section className="location-section">
          <div className="location-copy">
            <p className="eyebrow">VISÍTANOS</p>
            <h2>
              Chincha Alta,
              <br />
              Perú
            </h2>
            <a
              className="address-link"
              href="https://www.google.com/maps/search/?api=1&query=-13.41781595,-76.1336172"
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={18} />
              <span>
                Calle Mariscal Benavides 150
                <br />
                <small>Abrir ruta en Google Maps</small>
              </span>
            </a>
            <div className="dispatch">
              <p className="eyebrow">ZONA DE DESPACHO</p>
              <h3>Chincha Alta</h3>
              <p>Confirma cobertura y tiempo de entrega escribiéndonos por WhatsApp.</p>
            </div>
          </div>
          <a
            className="map-frame"
            href="https://www.google.com/maps/search/?api=1&query=-13.41781595,-76.1336172"
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir ubicación de La Yeka en Google Maps"
          >
            <iframe
              title="Ubicación de La Yeka"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-76.1432%2C-13.4232%2C-76.1244%2C-13.4124&layer=mapnik&marker=-13.41781595%2C-76.1336172"
              loading="lazy"
            />
          </a>
        </section>
        <footer>
          <div className="footer-brand">
            <a className="brand" href="#inicio" aria-label="La Yeka">
              <img src="/images/logo-la-yeka-v2.png" alt="La Yeka - Chincha Perú" />
            </a>
            <p>Hecho con hambre en Chincha Alta.</p>
          </div>
          <div>
            <h3>Pedidos</h3>
            <a href="#carta">Ver la carta</a>
            <button className="footer-link" onClick={() => setOpen(true)}>
              Mi pedido
            </button>
          </div>
          <div>
            <h3>Información</h3>
            <button className="footer-link" onClick={() => setDialog('terms')}>
              Términos y condiciones
            </button>
            <button className="footer-link" onClick={() => setDialog('privacy')}>
              Política de privacidad
            </button>
            <button className="footer-link" onClick={() => setDialog('claims')}>
              Libro de reclamaciones
            </button>
          </div>
          <div>
            <h3>Síguenos</h3>
            <div className="socials">
              <a
                href="https://www.instagram.com/layekahamburgueseria/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/LaYekaFastFood?locale=es_LA"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
      {open && (
        <aside className="drawer">
          <div className="overlay" onClick={() => setOpen(false)} />
          <div className="panel">
            <div className="drawer-top">
              <div>
                <p className="eyebrow">TU SELECCIÓN</p>
                <h2>Mi pedido</h2>
              </div>
              <button className="close" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="empty">
                <ShoppingBag size={38} />
                <h3>Tu bolsa está vacía</h3>
                <p>Explora la carta y agrega tus favoritos.</p>
                <button className="primary" onClick={() => setOpen(false)}>
                  Ver la carta
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((x) => (
                    <div className="cart-item" key={x.name}>
                      <div>
                        <h3>{x.name}</h3>
                        <p>{money(x.price)} c/u</p>
                        <div className="qty mt-2">
                          <button onClick={() => change(x.name, -1)}>
                            <Minus size={15} />
                          </button>
                          <b>{x.qty}</b>
                          <button onClick={() => change(x.name, 1)}>
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                      <strong>{money(x.price * x.qty)}</strong>
                      <button
                        className="ml-2 grid size-8 place-items-center rounded border-0 bg-red-50 text-red-700 hover:bg-red-100"
                        aria-label={`Eliminar ${x.name}`}
                        onClick={() => remove(x.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <input className="mt-4 w-full border border-stone-200 bg-white p-3 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" aria-label="Tu nombre" />
                <input className="mt-2 w-full border border-stone-200 bg-white p-3 text-sm" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Tu celular" type="tel" aria-label="Tu celular" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="¿Alguna indicación para tu pedido?"
                />
                <div className="total">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
                <button className="checkout" onClick={send} disabled={sending || !customerName.trim() || !customerPhone.trim()}>
                  {sending ? 'Registrando pedido…' : 'Enviar pedido por WhatsApp'} <ChevronRight size={19} />
                </button>
                <p className="secure">
                  <Star size={14} /> Revisa tu pedido antes de enviarlo
                </p>
              </>
            )}
          </div>
        </aside>
      )}
      {dialog && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setDialog(null)} />
          <section className="modal-card">
            <button className="close" onClick={() => setDialog(null)}>
              <X />
            </button>
            {dialog === 'terms' && (
              <>
                <p className="eyebrow">INFORMACIÓN LEGAL</p>
                <h2>Términos y condiciones</h2>
                <div className="legal-copy">
                  <p>
                    <b>Pedidos.</b> La confirmación depende de disponibilidad, cobertura de despacho
                    y validación del pedido por WhatsApp.
                  </p>
                  <p>
                    <b>Precios y productos.</b> Los precios se expresan en soles e incluyen los
                    conceptos informados en la carta. Las fotos son referenciales.
                  </p>
                  <p>
                    <b>Atención.</b> Para consultas sobre un pedido comunícate al +51 974 121 550.
                  </p>
                </div>
              </>
            )}
            {dialog === 'privacy' && (
              <>
                <p className="eyebrow">LEY N.° 29733</p>
                <h2>Política de privacidad</h2>
                <div className="legal-copy">
                  <p>
                    Recopilamos nombre, teléfono, dirección y datos del pedido solo para procesar,
                    entregar y atender consultas relacionadas con tu compra.
                  </p>
                  <p>
                    No usaremos tus datos para promociones sin tu consentimiento. Puedes solicitar
                    acceso, rectificación, cancelación u oposición escribiendo al WhatsApp de
                    atención.
                  </p>
                  <p>
                    La información se trata conforme a la Ley N.° 29733 y su Reglamento aprobado por
                    D.S. N.° 016-2024-JUS.
                  </p>
                </div>
              </>
            )}
            {dialog === 'claims' && (
              <>
                <p className="eyebrow">LIBRO DE RECLAMACIONES</p>
                <h2>Hoja de reclamación</h2>
                <p className="modal-lead">
                  Atenderemos tu queja o reclamo en un plazo máximo de 15 días hábiles
                  improrrogables.
                </p>
                {claimSent ? (
                  <div className="claim-success">
                    <h3>Solicitud registrada</h3>
                    <p>
                      Guarda esta confirmación. Te contactaremos mediante los datos proporcionados.
                    </p>
                  </div>
                ) : (
                  <form
                    className="claim-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitClaim(e.currentTarget).catch(() => alert('No se pudo registrar tu solicitud.'));
                    }}
                  >
                    <label>
                      Nombre completo
                      <input name="customerName" required />
                    </label>
                    <label>
                      DNI o documento
                      <input name="document" required />
                    </label>
                    <label>
                      Correo electrónico
                      <input name="email" type="email" required />
                    </label>
                    <label>
                      Teléfono
                      <input name="phone" type="tel" required />
                    </label>
                    <label>
                      Tipo
                      <select name="kind" required>
                        <option value="">Selecciona una opción</option>
                        <option value="COMPLAINT">Reclamo sobre producto o servicio</option>
                        <option value="SERVICE_ISSUE">Queja sobre atención</option>
                      </select>
                    </label>
                    <label>
                      Número de pedido (opcional)
                      <input name="orderReference" />
                    </label>
                    <label className="wide">
                      Detalle
                      <textarea name="detail" required placeholder="Cuéntanos qué ocurrió" />
                    </label>
                    <label className="wide">
                      Pedido del consumidor
                      <textarea name="requestedSolution" required placeholder="Indica la solución que solicitas" />
                    </label>
                    <label className="check wide">
                      <input type="checkbox" required /> Declaro que los datos proporcionados son
                      correctos.
                    </label>
                    <button className="checkout wide" type="submit">
                      Enviar hoja de reclamación
                    </button>
                  </form>
                )}
              </>
            )}
            {dialog === 'account' && (
              <>
                <p className="eyebrow">MI CUENTA</p>
                <h2>{accountName ? `Hola, ${accountName}` : accountMode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
                {accountName ? (
                  <div className="grid gap-4">
                    <p className="modal-lead">Tu cuenta está lista para asociar los pedidos que hagas desde este dispositivo.</p>
                    <div className="grid gap-2">
                      <h3 className="mb-0 text-base font-extrabold">Pedidos recientes</h3>
                      {orderHistory.length === 0 ? <p className="mb-0 text-sm text-stone-500">Aún no tienes pedidos registrados.</p> : orderHistory.map((order) => (
                        <article className="rounded border border-stone-200 p-3 text-sm" key={order.id}>
                          <div className="flex items-center justify-between gap-3"><strong>S/ {Number(order.total).toFixed(2)}</strong><span className="text-xs text-stone-500">{order.status}</span></div>
                          <p className="mt-1 mb-0 text-xs text-stone-500">{order.items.map((item) => item.quantity + '× ' + item.productName).join(', ')}</p>
                        </article>
                      ))}
                    </div>
                    <button className="checkout" onClick={() => { sessionStorage.removeItem('la-yeka-user-token'); sessionStorage.removeItem('la-yeka-user-name'); setAuthToken(''); setAccountName(''); }}>Cerrar sesión</button>
                  </div>
                ) : (
                  <form className="claim-form" onSubmit={(event) => { event.preventDefault(); submitAccount(event.currentTarget).catch(() => setAuthError('No se pudo completar la operación.')); }}>
                    {accountMode === 'register' && <label className="wide">Nombre completo<input name="name" required minLength={2} /></label>}
                    <label className="wide">Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
                    <label className="wide">Contraseña<input name="password" type="password" required minLength={10} autoComplete={accountMode === 'login' ? 'current-password' : 'new-password'} /></label>
                    {authError && <p className="wide rounded bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
                    <button className="checkout wide" type="submit">{accountMode === 'login' ? 'Ingresar a mi cuenta' : 'Crear cuenta segura'}</button>
                    <button className="wide border-0 bg-transparent text-sm font-bold underline" type="button" onClick={() => { setAuthError(''); setAccountMode(accountMode === 'login' ? 'register' : 'login'); }}>{accountMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
      <div
        className={`pointer-events-none fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded bg-yeka-ink px-5 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 ${cartNotice ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Check size={18} className="text-yeka-gold" />
        {cartNotice}
      </div>
      {showBackToTop && (
        <button
          className="fixed right-5 bottom-5 z-40 flex size-12 items-center justify-center rounded-full border-0 bg-yeka-gold text-yeka-ink shadow-lg transition hover:-translate-y-1 hover:brightness-95"
          aria-label="Volver al inicio"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp size={21} />
        </button>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
