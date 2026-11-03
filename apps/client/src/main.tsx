import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUp, Check, ChevronRight, Flame, LogIn, MapPin, Minus, Plus, ShoppingBag, Star, UserRound, UtensilsCrossed, X } from 'lucide-react';
import './tailwind.css';
import { apiBase, featuredNames, money, productVisual, whatsappNumber as defaultWhatsApp } from './lib/client-config';
import type { CartItem, OrderHistory, Product } from './types/catalog';

function App() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [store, setStore] = useState({ businessName: 'La Yeka', whatsapp: defaultWhatsApp, address: 'Calle Mariscal Benavides 150, Chincha Alta', district: 'Chincha Alta', openingHours: 'Todos los días · 6:00 p. m. a 11:00 p. m.', deliveryNote: 'Confirma cobertura y tiempo de entrega por WhatsApp.' });
  const [active, setActive] = useState('Todo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Chincha Alta');
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
  const deleteTimeout = useRef<number | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const [burgerBuild, setBurgerBuild] = useState<{ x: number; y: number; flyX: number; flyY: number; id: number } | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const burgerBuildTimeout = useRef<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('google_token');
    const error = params.get('google_error');
    if (!token && !error) return;
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    if (token) {
      sessionStorage.setItem('la-yeka-user-token', token);
      setAuthToken(token);
      setDialog(null);
    }
    if (error) { setAuthError(error); setDialog('account'); }
  }, []);
  useEffect(() => {
    const base = apiBase;
    if (base === null) { setCatalogState('error'); return; }
    fetch(base + '/api/catalog')
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((categories) => {
        const next = categories.flatMap((category: { name: string; products: Array<{ id:string; name:string; description:string; price:string; imagePath?:string | null; isFeatured?:boolean }> }) => category.products.map((product) => ({ id: product.id, name: product.name, detail: product.description || '', price: Number(product.price), category: category.name, imagePath: product.imagePath, tag: product.isFeatured ? 'Favorita' : undefined })));
        setCatalog(next); setCatalogState('ready');
      })
      .catch(() => setCatalogState('error'));
  }, [])
  useEffect(() => {
    const base = apiBase;
    if (base === null) return;
    fetch(base + '/api/settings').then((response) => response.ok ? response.json() : null).then((settings) => {
      if (!settings) return;
      setStore(settings);
      setDistrict(settings.district || 'Chincha Alta');
    }).catch(() => undefined);
  }, []);
  useEffect(() => { const base = apiBase; if (base === null || !authToken) return; const headers = { Authorization: 'Bearer ' + authToken }; Promise.all([fetch(base + '/api/auth/me', { headers }), fetch(base + '/api/orders/me', { headers })]).then(async ([profile, orders]) => { if (!profile.ok || !orders.ok) throw new Error(); const { user } = await profile.json(); setAccountName(user.name || user.email); setCustomerName(user.name || ''); setCustomerPhone(user.phone || ''); setAddress(user.deliveryAddress || ''); setDistrict(user.district || store.district || 'Chincha Alta'); setOrderHistory(await orders.json()); }).catch(() => { sessionStorage.removeItem('la-yeka-user-token'); sessionStorage.removeItem('la-yeka-user-name'); setAuthToken(''); setAccountName(''); setOrderHistory([]); }); }, [authToken])
  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY > 400);
    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTopVisibility);
  }, []);
  const extras = useMemo(() => catalog.filter((product) => product.category === 'Complementos'), [catalog]);
  const menuProducts = useMemo(() => catalog.filter((product) => product.category !== 'Complementos'), [catalog]);
  const shown = useMemo(() => active === 'Todo' ? menuProducts : menuProducts.filter((p) => p.category === active), [active, menuProducts]);
  const categories = useMemo(() => ['Todo', ...Array.from(new Set(menuProducts.map((product) => product.category)))], [menuProducts]);
  const topPicks = useMemo(() => menuProducts.filter((product) => featuredNames.includes(product.name)), [menuProducts]);
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const hasSavedContact = Boolean(authToken && customerName.trim() && customerPhone.trim() && (fulfillment === 'PICKUP' || (address.trim() && district.trim())));
  const triggerBurgerBuild = (origin: HTMLButtonElement) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cartButtonRef.current) return;
    const source = origin.getBoundingClientRect();
    const target = cartButtonRef.current.getBoundingClientRect();
    if (burgerBuildTimeout.current !== null) window.clearTimeout(burgerBuildTimeout.current);
    setBurgerBuild({ x: source.left + source.width / 2, y: source.top + source.height / 2, flyX: target.left + target.width / 2 - (source.left + source.width / 2), flyY: target.top + target.height / 2 - (source.top + source.height / 2), id: Date.now() });
    setCartPulse(true);
    burgerBuildTimeout.current = window.setTimeout(() => { setBurgerBuild(null); setCartPulse(false); }, 1050);
  };
  const add = (p: Product, origin?: HTMLButtonElement) => {
    setCart((c) => {
      const current = c.find((x) => x.name === p.name);
      return current
        ? c.map((x) => (x.name === p.name ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { ...p, qty: 1 }];
    });
    setCartNotice(`${p.name} agregado al carrito`);
    if (cartNoticeTimeout.current !== null) window.clearTimeout(cartNoticeTimeout.current);
    cartNoticeTimeout.current = window.setTimeout(() => setCartNotice(''), 2500);
    if (origin && p.category !== 'Bebidas' && p.category !== 'Complementos') triggerBurgerBuild(origin);
  };
  useEffect(() => () => {
    if (cartNoticeTimeout.current !== null) window.clearTimeout(cartNoticeTimeout.current);
    if (burgerBuildTimeout.current !== null) window.clearTimeout(burgerBuildTimeout.current);
    if (deleteTimeout.current !== null) window.clearTimeout(deleteTimeout.current);
  }, []);
  const change = (name: string, d: number) =>
    setCart((c) =>
      c.flatMap((x) =>
        x.name === name && x.qty + d === 0 ? [] : x.name === name ? { ...x, qty: x.qty + d } : x,
      ),
    );
  const remove = (name: string) => {
    if (deletingItem) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCart((items) => items.filter((item) => item.name !== name));
      return;
    }
    setDeletingItem(name);
    deleteTimeout.current = window.setTimeout(() => {
      setCart((items) => items.filter((item) => item.name !== name));
      setDeletingItem(null);
      deleteTimeout.current = null;
    }, 520);
  };
  const send = async () => {
    if (!cart.length) return;
    if (!customerName.trim() || !customerPhone.trim() || (fulfillment === 'DELIVERY' && (!address.trim() || !district.trim()))) return;
    setSending(true);
    const api = apiBase;
    let orderId = '';
    try {
      if (api !== null && cart.every((item) => item.id)) {
        const response = await fetch(api + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: JSON.stringify({ customerName, customerPhone, notes: note, fulfillment, paymentMethod, paymentReference: paymentMethod === 'YAPE' ? paymentReference : undefined, address: fulfillment === 'DELIVERY' ? address : undefined, district: fulfillment === 'DELIVERY' ? district : undefined, items: cart.map((item) => ({ productId: item.id, quantity: item.qty })) }) });
        if (!response.ok) throw new Error('No fue posible registrar el pedido');
        const created = await response.json();
        if (paymentMethod === 'YAPE') {
          if (!paymentProof) throw new Error('Adjunta el voucher de Yape para continuar.');
          const form = new FormData(); form.append('proof', paymentProof);
          const proofResponse = await fetch(`${api}/api/orders/${created.id}/payment-proof`, { method:'POST', headers:{'X-Payment-Token':created.paymentToken}, body:form });
          if (!proofResponse.ok) { const body = await proofResponse.json().catch(() => ({})); throw new Error(body.error || 'No se pudo subir el voucher.'); }
        }
        orderId = `YEKA-${String(created.orderNumber).padStart(6, '0')}`;
      }
    } catch (error) { alert(error instanceof Error ? error.message : 'Error al registrar el pedido'); setSending(false); return; }
    const lines = cart.map((x) => `• ${x.qty}x ${x.name} — ${money(x.price * x.qty)}`).join('\n');
    const text = `¡Hola, La Yeka! Quiero hacer este pedido:${orderId ? `%0AOrden: ${orderId}` : ''}%0A%0A${encodeURIComponent(lines)}%0A%0AModalidad: ${fulfillment === 'DELIVERY' ? 'Delivery' : 'Recojo en local'}%0APago: ${paymentMethod}${paymentMethod === 'YAPE' ? `%0ACódigo Yape: ${encodeURIComponent(paymentReference)}` : ''}%0ATotal: ${encodeURIComponent(money(total))}${fulfillment === 'DELIVERY' ? `%0ADirección: ${encodeURIComponent(address + ', ' + district)}` : ''}${note ? `%0AIndicaciones: ${encodeURIComponent(note)}` : ''}`;
    window.open(`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${text}`, '_blank');
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
    const payload = { name: data.get('name'), email: data.get('email'), password: data.get('password'), phone: data.get('phone'), deliveryAddress: data.get('deliveryAddress'), district: data.get('district') };
    const endpoint = accountMode === 'login' ? 'login' : 'register';
    const response = await fetch(api + '/api/auth/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountMode === 'login' ? { email: payload.email, password: payload.password } : payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setAuthError(body.error || 'No se pudo completar la operación.'); return; }
    sessionStorage.setItem('la-yeka-user-token', body.token);
    sessionStorage.setItem('la-yeka-user-name', body.user.name || body.user.email);
    setAuthToken(body.token); setAccountName(body.user.name || body.user.email); setDialog(null);
  };
  const updateProfile = async (form: HTMLFormElement) => {
    const api = apiBase;
    if (api === null || !authToken) return;
    setAuthError('');
    const data = new FormData(form);
    const response = await fetch(api + '/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: data.get('name'), phone: data.get('phone'), deliveryAddress: data.get('deliveryAddress'), district: data.get('district') }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setAuthError(body.error || 'No se pudieron guardar tus datos.'); return; }
    setAccountName(body.user.name || body.user.email);
    setCustomerName(body.user.name || ''); setCustomerPhone(body.user.phone || ''); setAddress(body.user.deliveryAddress || ''); setDistrict(body.user.district || store.district || 'Chincha Alta');
    setDialog(null);
  };
  const continueWithGoogle = () => {
    const api = apiBase;
    if (api === null) { setAuthError('El acceso con Google estará disponible al conectar la API.'); return; }
    window.location.assign(`${api}/api/auth/google?returnTo=${encodeURIComponent(window.location.origin)}`);
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
          <a href="#nosotros">Nosotros</a>
        </nav>
        <div className="header-actions flex items-center gap-2">
          <button className="account-button" onClick={() => { setAuthError(''); setDialog('account'); }}>
            {accountName ? <><UserRound size={17} /><span>{accountName.split(' ')[0]}</span></> : <><LogIn size={17} /><span>Iniciar sesión</span></>}
          </button>
          <button ref={cartButtonRef} className={`cart-button ${cartPulse ? 'cart-pulse' : ''}`} onClick={() => setOpen(true)}>
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
                {productVisual(p) ? <img src={productVisual(p)!} alt={p.name} /> : <div className="grid h-44 place-items-center bg-amber-50 text-amber-600"><UtensilsCrossed size={42} /></div>}
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.detail}</p>
                  <div>
                    <strong>{money(p.price)}</strong>
                    <button onClick={(event) => add(p, event.currentTarget)}>
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
            {catalogState !== 'loading' && shown.map((p, i) => (
              <article className={'product p' + (i % 5)} key={p.name}>
                {p.tag && <label>{p.tag}</label>}
                <div className={`product-art ${p.category === 'Bebidas' ? 'drink-art' : ''}`}>
                  {productVisual(p) ? <img src={productVisual(p)!} alt={p.name} /> : <UtensilsCrossed size={42} aria-label="Producto sin imagen" />}
                </div>
                <div className="product-info">
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.detail}</p>
                  </div>
                  <div className="card-bottom">
                    <strong>{money(p.price)}</strong>
                    <button aria-label={`Agregar ${p.name}`} onClick={(event) => add(p, event.currentTarget)}>
                      <Plus size={19} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {catalogState === 'loading' && Array.from({ length: 8 }, (_, index) => <article key={index} className="product animate-pulse"><div className="product-art bg-stone-200" /><div className="product-info"><div><div className="h-4 w-3/4 rounded bg-stone-200" /><div className="mt-2 h-3 w-full rounded bg-stone-100" /></div><div className="flex items-center justify-between"><div className="h-4 w-12 rounded bg-stone-200" /><div className="size-8 rounded-full bg-stone-200" /></div></div></article>)}
            {catalogState === 'error' && <p className="col-span-full py-12 text-center text-stone-500">No pudimos cargar la carta. Inténtalo nuevamente en unos minutos.</p>}
            {catalogState === 'ready' && shown.length === 0 && <p className="col-span-full py-12 text-center text-stone-500">Por ahora no hay productos disponibles en esta categoría.</p>}
          </div>
        </section>
        <section className="location-section">
          <div className="location-copy">
            <p className="eyebrow">VISÍTANOS</p>
            <h2>
              {store.district},
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
                {store.address}
                <br />
                <small>Abrir ruta en Google Maps</small>
              </span>
            </a>
            <div className="dispatch">
              <p className="eyebrow">ZONA DE DESPACHO</p>
              <h3>{store.district}</h3>
              <p>{store.deliveryNote}</p>
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
            <p>{store.openingHours}</p>
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
                    <div className={`cart-item ${deletingItem === x.name ? 'cart-item-removing' : ''}`} key={x.name}>
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
                        className={`cart-delete-button h-9 w-9 shrink-0 border-0 bg-red-50 text-red-700 ${deletingItem === x.name ? 'is-deleting' : ''}`}
                        aria-label={`Eliminar ${x.name}`}
                        onClick={() => remove(x.name)}
                        disabled={Boolean(deletingItem)}
                      >
                        <span className="trash-bin" aria-hidden="true"><span className="trash-food" /><span className="trash-lid" /><span className="trash-body"><i /><i /></span></span>
                      </button>
                    </div>
                  ))}
                </div>
                <ExtrasPicker extras={extras} onAdd={add} />
                <div className="mt-4 border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                  {!authToken ? <><b className="block text-yeka-ink">Inicia sesión para continuar</b><span>Guardaremos tus datos una sola vez para tus próximos pedidos.</span></> : hasSavedContact ? <><b className="block text-yeka-ink">Pedido para {customerName}</b><span>{customerPhone} · {fulfillment === 'DELIVERY' ? `${address}, ${district}` : 'Recojo en local'}</span></> : <><b className="block text-yeka-ink">Completa tus datos de pedido</b><span>Guárdalos una sola vez y los usaremos en tus próximos pedidos.</span></>}
                  <button className="mt-2 text-xs font-bold text-yeka-gold underline" onClick={() => { setAuthError(''); setDialog('account'); }}>{!authToken ? 'Iniciar sesión o crear cuenta' : hasSavedContact ? 'Editar mis datos' : 'Completar mi perfil'}</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="border border-stone-200 bg-white p-3 text-sm" value={fulfillment} onChange={(event) => setFulfillment(event.target.value as 'DELIVERY' | 'PICKUP')} aria-label="Modalidad de entrega"><option value="DELIVERY">Delivery</option><option value="PICKUP">Recojo en local</option></select>
                  <select className="border border-stone-200 bg-white p-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} aria-label="Método de pago"><option value="CASH">Efectivo</option><option value="YAPE">Yape</option></select>
                </div>
                {paymentMethod === 'YAPE' && <div className="mt-2 grid gap-2"><input className="w-full border border-stone-200 bg-white p-3 text-sm" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Código de operación Yape" aria-label="Código de operación Yape" /><label className="block border border-dashed border-stone-300 bg-stone-50 p-3 text-sm font-semibold text-stone-700">Voucher Yape<input className="mt-2 block w-full text-xs font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPaymentProof(event.target.files?.[0] || null)} /><span className="mt-1 block text-xs font-normal text-stone-500">{paymentProof ? `Adjunto: ${paymentProof.name}` : 'JPG, PNG o WEBP; máximo 4 MB.'}</span></label></div>}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="¿Alguna indicación para tu pedido?"
                />
                <div className="total">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
                <button className="checkout" onClick={send} disabled={!authToken || sending || !customerName.trim() || !customerPhone.trim() || (paymentMethod === 'YAPE' && (!paymentReference.trim() || !paymentProof)) || (fulfillment === 'DELIVERY' && (!address.trim() || !district.trim()))}>
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
                  <div className="account-content">
                    <p className="modal-lead">Tus datos se usan automáticamente cuando haces un pedido.</p>
                    <section className="account-profile">
                      <div><p className="eyebrow">PERFIL DE ENTREGA</p><h3>Datos de entrega</h3></div>
                      <form className="account-profile-form" onSubmit={(event) => { event.preventDefault(); updateProfile(event.currentTarget).catch(() => setAuthError('No se pudieron guardar tus datos.')); }}>
                      <label>Nombre completo<input name="name" required minLength={2} defaultValue={customerName} /></label>
                      <label>Celular<input name="phone" required minLength={7} type="tel" defaultValue={customerPhone} /></label>
                      <label className="wide">Dirección de entrega<input name="deliveryAddress" required minLength={5} defaultValue={address} /></label>
                      <label className="wide">Distrito<input name="district" required minLength={2} defaultValue={district} /></label>
                      {authError && <p className="wide rounded bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
                      <button className="account-save wide" type="submit">Guardar mis datos</button>
                      </form>
                    </section>
                    <section className="account-orders">
                      <h3>Pedidos recientes</h3>
                      {orderHistory.length === 0 ? <p className="mb-0 text-sm text-stone-500">Aún no tienes pedidos registrados.</p> : orderHistory.map((order) => (
                        <article className="rounded border border-stone-200 p-3 text-sm" key={order.id}>
                          <div className="flex items-center justify-between gap-3"><strong>YEKA-{String(order.orderNumber).padStart(6, '0')} · S/ {Number(order.total).toFixed(2)}</strong><span className="text-xs text-stone-500">{order.status}</span></div>
                          <p className="mt-1 mb-0 text-xs text-stone-500">{order.items.map((item) => item.quantity + '× ' + item.productName).join(', ')}</p>
                        </article>
                      ))}
                    </section>
                    <button className="account-logout" onClick={() => { sessionStorage.removeItem('la-yeka-user-token'); sessionStorage.removeItem('la-yeka-user-name'); setAuthToken(''); setAccountName(''); }}>Cerrar sesión</button>
                  </div>
                ) : (
                  <form className="claim-form" onSubmit={(event) => { event.preventDefault(); submitAccount(event.currentTarget).catch(() => setAuthError('No se pudo completar la operación.')); }}>
                    {accountMode === 'register' && <><label className="wide">Nombre completo<input name="name" required minLength={2} /></label><label>Celular<input name="phone" required type="tel" minLength={7} /></label><label>Distrito<input name="district" required minLength={2} defaultValue={store.district} /></label><label className="wide">Dirección de entrega<input name="deliveryAddress" required minLength={5} /></label></>}
                    <label className="wide">Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
                    <label className="wide">Contraseña<input name="password" type="password" required minLength={10} autoComplete={accountMode === 'login' ? 'current-password' : 'new-password'} /></label>
                    {authError && <p className="wide rounded bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
                    <button className="checkout wide" type="submit">{accountMode === 'login' ? 'Ingresar a mi cuenta' : 'Crear cuenta segura'}</button>
                    <div className="wide flex items-center gap-3 text-xs text-stone-400 before:h-px before:flex-1 before:bg-stone-200 after:h-px after:flex-1 after:bg-stone-200">o</div>
                    <button className="google-login wide" type="button" onClick={continueWithGoogle}><span aria-hidden="true">G</span> Continuar con Google</button>
                    <button className="wide border-0 bg-transparent text-sm font-bold underline" type="button" onClick={() => { setAuthError(''); setAccountMode(accountMode === 'login' ? 'register' : 'login'); }}>{accountMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {burgerBuild && (
        <div
          key={burgerBuild.id}
          aria-hidden="true"
          className="burger-build"
          style={{ left: burgerBuild.x, top: burgerBuild.y, '--fly-x': `${burgerBuild.flyX}px`, '--fly-y': `${burgerBuild.flyY}px` } as CSSProperties}
        >
          <span className="burger-layer burger-top" />
          <span className="burger-layer burger-sauce" />
          <span className="burger-layer burger-cheese" />
          <span className="burger-layer burger-patty" />
          <span className="burger-layer burger-lettuce" />
          <span className="burger-layer burger-bottom" />
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

function ExtrasPicker({ extras, onAdd }: { extras: Product[]; onAdd: (extra: Product) => void }) {
  if (!extras.length) return null;
  return <section className="cart-extras"><div><p className="eyebrow">HAZLO MÁS YEKA</p><h3>Agrega complementos</h3><p>Personaliza tu pedido antes de enviarlo.</p></div><div className="cart-extra-list">{extras.map((extra) => <button key={extra.id || extra.name} onClick={() => onAdd(extra)}><span>{extra.name}</span><b>+ {money(extra.price)}</b><Plus size={15} /></button>)}</div></section>;
}
createRoot(document.getElementById('root')!).render(<App />);
