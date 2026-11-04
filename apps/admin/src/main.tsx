import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  Download,
  DollarSign,
  Menu,
  Bell,
  CheckCircle2,
  ChartNoAxesCombined,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Package,
  Plus,
  Printer,
  Pencil,
  RefreshCw,
  Search,
  ScrollText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Trash2,
  Upload,
  UtensilsCrossed,
  UsersRound,
  X,
} from 'lucide-react';
import './styles.css';
import { api, brandLogo, labels, statusOptions } from './lib/admin-config';
import type {
  AdminAlert,
  AdminUser,
  AuditLog,
  CashShiftData,
  Category,
  Claim,
  Dashboard,
  Order,
  OrderTable,
  Product,
  StoreSettings,
  View,
} from './types/admin';
import { ContentSkeleton, Empty, Stat, Status } from './components/ui';
import { useAdminRequest } from './hooks/use-admin-request';
import { DashboardPage } from './pages/DashboardPage';
import { CashPage } from './pages/OperationsPages';
import { CategoryManagerDialog } from './components/CategoryManagerDialog';

const escapePrint = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('la-yeka-admin-token') || '');
  const [user, setUser] = useState(() => sessionStorage.getItem('la-yeka-admin-user') || '');
  const [view, setView] = useState<View>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimFilter, setClaimFilter] = useState<'all' | 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED'>(
    'all',
  );
  const [claimDrafts, setClaimDrafts] = useState<Record<string, string>>({});
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cashData, setCashData] = useState<CashShiftData | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month'>('today');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'paused'>(
    'all',
  );
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({});
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, Order['paymentStatus']>>(
    {},
  );
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('');
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [mobileOrderColumn, setMobileOrderColumn] = useState('Nuevos');
  const [orderTable, setOrderTable] = useState<Omit<OrderTable, 'data'>>({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  });
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [savingCategoryId, setSavingCategoryId] = useState('');
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const knownOrderIds = useRef<Set<string> | null>(null);
  const notificationAudio = useRef<AudioContext | null>(null);
  const request = useAdminRequest(token);
  const orderTableUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(orderPage), pageSize: '12' });
    if (orderQuery.trim()) params.set('query', orderQuery.trim());
    if (orderStatusFilter) params.set('status', orderStatusFilter);
    if (orderPaymentFilter) params.set('payment', orderPaymentFilter);
    if (orderFulfillmentFilter) params.set('fulfillment', orderFulfillmentFilter);
    return `/admin/orders/table?${params.toString()}`;
  }, [orderFulfillmentFilter, orderPage, orderPaymentFilter, orderQuery, orderStatusFilter]);
  const prepareNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const context = notificationAudio.current ?? new AudioContext();
    notificationAudio.current = context;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
  }, []);
  const playNewOrderSound = useCallback(() => {
    prepareNotificationSound();
    const context = notificationAudio.current;
    if (!context) return;
    const play = () => {
      const now = context.currentTime;
      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.16);
        gain.gain.setValueAtTime(0.0001, now + index * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.11, now + index * 0.16 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.14);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.16);
        oscillator.stop(now + index * 0.16 + 0.16);
      });
    };
    if (context.state === 'suspended')
      void context
        .resume()
        .then(play)
        .catch(() => undefined);
    else play();
  }, [prepareNotificationSound]);
  const refreshAlerts = useCallback(async () => {
    if (!token) return;
    try {
      setAlerts((await request('/admin/alerts')).alerts);
    } catch {
      /* Alerts should not interrupt the current workspace. */
    }
  }, [request, token]);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (view === 'dashboard')
        setDashboard(await request(`/admin/dashboard?range=${reportRange}`));
      if (view === 'products') {
        const [productData, categoryData] = await Promise.all([
          request('/admin/products'),
          request('/admin/categories'),
        ]);
        setProducts(productData);
        setCategories(categoryData);
      }
      if (view === 'orders') {
        const table = (await request(orderTableUrl)) as OrderTable;
        setOrders(table.data);
        setOrderTable({ total: table.total, page: table.page, pageSize: table.pageSize, totalPages: table.totalPages });
      }
      if (view === 'cash') setCashData(await request('/admin/cash-shifts'));
      if (view === 'claims') setClaims(await request('/admin/claims'));
      if (view === 'settings') setStoreSettings(await request('/admin/settings'));
      if (view === 'team') setTeam(await request('/admin/team'));
      if (view === 'audit') setAuditLogs(await request('/admin/audit'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con la API.');
    } finally {
      setLoading(false);
    }
  }, [orderTableUrl, reportRange, request, token, view]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);
  useEffect(() => {
    if (!token) {
      knownOrderIds.current = null;
      setLastSync(null);
      return;
    }
    let cancelled = false;
    const syncOperations = async () => {
      try {
        const [liveOrders, alertData] = await Promise.all([
          request('/admin/orders'),
          request('/admin/alerts'),
        ]);
        if (cancelled) return;
        const previous = knownOrderIds.current;
        const newOrders = previous
          ? liveOrders.filter((order: Order) => !previous.has(order.id))
          : [];
        knownOrderIds.current = new Set(liveOrders.map((order: Order) => order.id));
        if (view !== 'orders') setOrders(liveOrders);
        setAlerts(alertData.alerts);
        setLastSync(new Date());
        if (view === 'dashboard')
          setDashboard(await request(`/admin/dashboard?range=${reportRange}`));
        if (newOrders.length) {
          playNewOrderSound();
          setNotice(
            `${newOrders.length === 1 ? 'Nuevo pedido recibido' : `${newOrders.length} pedidos nuevos recibidos`}.`,
          );
        }
      } catch {
        /* The foreground screen keeps working if a background refresh fails. */
      }
    };
    void syncOperations();
    const interval = window.setInterval(() => void syncOperations(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [playNewOrderSound, reportRange, request, token, view]);
  useEffect(
    () => () => {
      void notificationAudio.current?.close();
    },
    [],
  );
  useEffect(() => {
    setDraftPrices(Object.fromEntries(products.map((product) => [product.id, product.price])));
  }, [products]);
  useEffect(() => {
    setPaymentReferences(
      Object.fromEntries(orders.map((order) => [order.id, order.paymentReference || ''])),
    );
    setPaymentStatuses(Object.fromEntries(orders.map((order) => [order.id, order.paymentStatus])));
  }, [orders]);
  useEffect(() => {
    setClaimDrafts(
      Object.fromEntries(claims.map((claim) => [claim.id, claim.adminResponse || ''])),
    );
  }, [claims]);
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    prepareNotificationSound();
    setError('');
    setIsAuthenticating(true);
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
    } finally {
      setIsAuthenticating(false);
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
      await refreshAlerts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSavingId('');
    }
  };
  const exportOrders = async () => {
    setError('');
    try {
      const response = await fetch(`${api}/api${orderTableUrl.replace('/table', '/export')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo exportar los pedidos.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pedidos-la-yeka-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice('Archivo de pedidos descargado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo exportar los pedidos.');
    }
  };
  const printOrder = (order: Order) => {
    const receipt = window.open('', `yeka-order-${order.orderNumber}`, 'width=420,height=680');
    if (!receipt) {
      setError('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo otra vez.');
      return;
    }
    const code = `YEKA-${String(order.orderNumber).padStart(6, '0')}`;
    const items = order.items
      .map((item) => `<li><b>${item.quantity}×</b> ${escapePrint(item.productName)}</li>`)
      .join('');
    receipt.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${code}</title><style>
      @page{size:80mm auto;margin:7mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif;font-size:12px}header{border-bottom:2px solid #f7ad22;padding-bottom:10px;text-align:center}h1{margin:0;font-size:22px}h2{margin:8px 0 2px;font-size:15px}.muted{color:#555;font-size:11px}.code{font-family:monospace;font-weight:700}section{padding:11px 0;border-bottom:1px dashed #aaa}p{margin:4px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}.label{color:#666;font-size:10px;text-transform:uppercase}ul{list-style:none;margin:8px 0 0;padding:0}li{display:flex;gap:7px;padding:5px 0;border-bottom:1px solid #eee}.note{background:#fff5dc;padding:8px}.total{display:flex;justify-content:space-between;font-size:17px;font-weight:800;padding-top:12px}footer{padding-top:12px;text-align:center;color:#555;font-size:10px}</style></head><body>
      <header><h1>LA YEKA</h1><p class="muted">Comanda de pedido</p><p class="code">${code}</p></header>
      <section class="meta"><div><p class="label">Cliente</p><p>${escapePrint(order.customerName || 'Cliente sin nombre')}</p></div><div><p class="label">Celular</p><p>${escapePrint(order.customerPhone || '—')}</p></div><div><p class="label">Fecha</p><p>${escapePrint(new Date(order.createdAt).toLocaleString('es-PE'))}</p></div><div><p class="label">Modalidad</p><p>${escapePrint(labels[order.fulfillment])}</p></div></section>
      ${order.fulfillment === 'DELIVERY' ? `<section><p class="label">Dirección de entrega</p><p>${escapePrint([order.address, order.district].filter(Boolean).join(' · ') || 'Por confirmar')}</p></section>` : ''}
      <section><p class="label">Productos</p><ul>${items}</ul></section>
      ${order.notes ? `<section><p class="label">Indicaciones</p><p class="note">${escapePrint(order.notes)}</p></section>` : ''}
      <div class="total"><span>Total</span><span>S/ ${(Number(order.total) + Number(order.deliveryFee || 0)).toFixed(2)}</span></div>
      <footer>Pago: ${escapePrint(labels[order.paymentMethod])} · ${escapePrint(labels[order.paymentStatus])}<br>Gracias por elegir La Yeka.</footer>
      <script>window.onload=()=>{window.focus();window.print()}<\/script></body></html>`);
    receipt.document.close();
  };
  const openCashShift = async (openingAmount: number, notes: string) => {
    setSavingId('cash');
    setError('');
    try {
      await request('/admin/cash-shifts', { method: 'POST', body: JSON.stringify({ openingAmount, notes }) });
      setNotice('Caja abierta correctamente.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir caja.');
    } finally {
      setSavingId('');
    }
  };
  const closeCashShift = async (closingAmount: number, notes: string) => {
    if (!cashData?.openShift) return;
    setSavingId('cash');
    setError('');
    try {
      await request(`/admin/cash-shifts/${cashData.openShift.id}/close`, { method: 'PATCH', body: JSON.stringify({ closingAmount, notes }) });
      setNotice('Caja cerrada correctamente.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar caja.');
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
      const matchesQuery =
        !query || `${product.name} ${product.description || ''}`.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === 'all' || product.category?.name === categoryFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' ? product.isAvailable : !product.isAvailable);
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [availabilityFilter, categoryFilter, productQuery, products]);
  const operationColumns = useMemo(
    () =>
      [
        { title: 'Nuevos', statuses: ['PENDING'], tone: 'border-amber-400' },
        { title: 'En cocina', statuses: ['CONFIRMED', 'PREPARING'], tone: 'border-orange-400' },
        { title: 'Listos / entrega', statuses: ['READY'], tone: 'border-emerald-400' },
        { title: 'Cerrados', statuses: ['DELIVERED', 'CANCELLED'], tone: 'border-slate-300' },
      ].map((column) => ({
        ...column,
        orders: orders.filter((order) => column.statuses.includes(order.status)),
      })),
    [orders],
  );
  const nextOrderAction: Record<string, { status: string; label: string }> = {
    PENDING: { status: 'CONFIRMED', label: 'Confirmar pedido' },
    CONFIRMED: { status: 'PREPARING', label: 'Iniciar preparación' },
    PREPARING: { status: 'READY', label: 'Marcar como listo' },
    READY: { status: 'DELIVERED', label: 'Cerrar como entregado' },
  };
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
    setSavingProduct(true);
    setError('');
    try {
      const data = {
        name: fields.get('name'),
        description: fields.get('description') || null,
        price: Number(fields.get('price')),
        categoryId: fields.get('categoryId') || null,
        isAvailable: fields.get('isAvailable') === 'on',
      };
      const product = editingProduct
        ? await request(`/admin/products/${editingProduct.id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          })
        : await request('/admin/products', { method: 'POST', body: JSON.stringify(data) });
      if (productImage) {
        const { url } = await uploadProductImage(productImage);
        await request(`/admin/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ imagePath: url }),
        });
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductImage(null);
      await load();
      setNotice(
        editingProduct ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };
  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    setSavingId(product.id);
    setError('');
    try {
      await request(`/admin/products/${product.id}`, { method: 'DELETE' });
      await load();
      setNotice('Producto eliminado correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el producto.');
    } finally {
      setSavingId('');
    }
  };
  const createCategory = async (name: string) => {
    setError('');
    try {
      await request('/admin/categories', { method: 'POST', body: JSON.stringify({ name }) });
      await load();
      setNotice('Categoría creada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la categoría.');
    }
  };
  const updateCategory = async (
    id: string,
    data: Partial<Pick<Category, 'name' | 'position' | 'isAvailable'>>,
  ) => {
    setSavingCategoryId(id);
    setError('');
    try {
      await request(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await load();
      setNotice('Categoría actualizada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la categoría.');
    } finally {
      setSavingCategoryId('');
    }
  };
  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    setSavingCategoryId(category.id);
    setError('');
    try {
      await request(`/admin/categories/${category.id}`, { method: 'DELETE' });
      await load();
      setNotice('Categoría eliminada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la categoría.');
    } finally {
      setSavingCategoryId('');
    }
  };
  const openProductForm = (product: Product | null = null) => {
    setEditingProduct(product);
    setProductImage(null);
    setShowProductForm(true);
  };
  const openWhatsApp = (order: Order) => {
    const phone = order.customerPhone?.replace(/\D/g, '');
    if (!phone) return setError('El pedido no tiene un número de celular válido.');
    const normalized = phone.startsWith('51') ? phone : `51${phone}`;
    const subtotal = Number(order.total);
    const delivery = Number(order.deliveryFee || 0);
    const deliveryMessage =
      order.fulfillment === 'DELIVERY'
        ? order.deliveryQuotedAt
          ? `%0A%0ASubtotal: S/ ${subtotal.toFixed(2)}%0ADelivery: S/ ${delivery.toFixed(2)}%0ATotal a pagar: S/ ${(subtotal + delivery).toFixed(2)}%0A%0AConfírmanos para coordinar el pago y despacho.`
          : '%0A%0AEstamos calculando el costo de delivery según tu dirección. Te confirmaremos el total antes de solicitar el pago.'
        : `%0A%0ATotal: S/ ${subtotal.toFixed(2)}`;
    const message = `Hola ${order.customerName || ''}, te escribimos de La Yeka por tu pedido YEKA-${String(order.orderNumber).padStart(6, '0')}.%0A%0A${order.items.map((item) => `${item.quantity}× ${item.productName}`).join('%0A')}${deliveryMessage}%0AEstado: ${labels[order.status]}.`;
    window.open(`https://wa.me/${normalized}?text=${message}`, '_blank', 'noopener,noreferrer');
  };
  const savePayment = async (order: Order) => {
    setSavingId(order.id);
    setError('');
    try {
      await request(`/admin/orders/${order.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: paymentStatuses[order.id] || order.paymentStatus,
          reference: paymentReferences[order.id] || null,
        }),
      });
      await load();
      setNotice('Información de pago actualizada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el pago.');
    } finally {
      setSavingId('');
    }
  };
  const cancelOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancellingOrder || cancelReason.trim().length < 5) return;
    setSavingId(cancellingOrder.id);
    setError('');
    try {
      await request(`/admin/orders/${cancellingOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED', reason: cancelReason.trim() }),
      });
      setCancellingOrder(null);
      setCancelReason('');
      await load();
      await refreshAlerts();
      setNotice('Pedido cancelado y motivo registrado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar el pedido.');
    } finally {
      setSavingId('');
    }
  };
  const saveClaim = async (
    claim: Claim,
    data: { status?: string; adminResponse?: string | null },
  ) => {
    setSavingId(claim.id);
    setError('');
    try {
      await request(`/admin/claims/${claim.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await load();
      await refreshAlerts();
      setNotice('Seguimiento del reclamo guardado correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el reclamo.');
    } finally {
      setSavingId('');
    }
  };
  const saveStoreSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingId('settings');
    setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const saved = await request('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          businessName: fields.get('businessName'),
          whatsapp: fields.get('whatsapp'),
          address: fields.get('address'),
          district: fields.get('district'),
          openingHours: fields.get('openingHours'),
          deliveryNote: fields.get('deliveryNote'),
        }),
      });
      setStoreSettings(saved);
      setNotice('Configuración operativa guardada correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la configuración.');
    } finally {
      setSavingId('');
    }
  };
  const saveAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingId('team');
    setError('');
    const fields = new FormData(event.currentTarget);
    const data = {
      name: fields.get('name'),
      ...(editingAdmin ? {} : { email: fields.get('email') }),
      ...(fields.get('password') ? { password: fields.get('password') } : {}),
    };
    try {
      await request(editingAdmin ? `/admin/team/${editingAdmin.id}` : '/admin/team', {
        method: editingAdmin ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      });
      setShowTeamForm(false);
      setEditingAdmin(null);
      await load();
      setNotice(
        editingAdmin ? 'Acceso administrativo actualizado.' : 'Nueva cuenta administrativa creada.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el acceso.');
    } finally {
      setSavingId('');
    }
  };
  const toggleAdminUser = async (member: AdminUser) => {
    setSavingId(member.id);
    setError('');
    try {
      await request(`/admin/team/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      await load();
      setNotice(member.isActive ? 'Acceso desactivado.' : 'Acceso reactivado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el acceso.');
    } finally {
      setSavingId('');
    }
  };
  const filteredClaims = useMemo(
    () => claims.filter((claim) => claimFilter === 'all' || claim.status === claimFilter),
    [claimFilter, claims],
  );
  if (!token)
    return (
      <main className="login-shell relative grid min-h-[100dvh] place-items-center overflow-hidden px-4 py-4 text-slate-950 sm:px-6 sm:py-8">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />
        <section className="login-card relative grid w-full overflow-hidden rounded-[24px] sm:grid-cols-[0.95fr_1.05fr]">
          <aside className="login-brand relative hidden flex-col justify-between overflow-hidden text-white sm:flex">
            <div className="relative z-10 flex items-center gap-3">
              <div className="grid h-12 w-14 place-items-center overflow-hidden rounded-xl border border-amber-300/30 bg-black/25 px-1 backdrop-blur">
                <img src={brandLogo} alt="La Yeka" className="max-h-10 w-auto object-contain" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-amber-100">LA YEKA · ADMIN</span>
            </div>
            <div className="login-brand-copy relative z-10">
              <div className="mb-6 h-px w-12 bg-amber-400" />
              <h1 className="max-w-sm text-4xl font-black leading-[1.08] tracking-tight">
                Todo tu negocio, en un solo lugar.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                Supervisa pedidos, organiza tu carta y atiende a tus clientes con agilidad.
              </p>
            </div>
            <p className="relative z-10 text-xs font-medium text-slate-400">Operaciones La Yeka</p>
          </aside>
          <div className="login-form-panel flex flex-col">
            <div className="flex items-center justify-between sm:hidden">
              <div className="login-form-logo">
                <img src="/images/logo-login-la-yeka.png" alt="La Yeka" />
              </div>
              <span className="rounded-full bg-[#fff4d6] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] text-[#9a6800]">ADMIN</span>
            </div>
            <div className="hidden sm:block">
              <div className="login-form-logo">
                <img src="/images/logo-login-la-yeka.png" alt="La Yeka" />
              </div>
            </div>
            <div className="login-form-content">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-[#b86d00]">
                <span className="grid size-7 place-items-center rounded-lg bg-[#fff2cf]"><ShieldCheck size={16} /></span>
                ACCESO SEGURO
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Bienvenido de vuelta</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Ingresa tus credenciales para continuar al panel de operación.</p>
              <form className="login-form mt-7 grid gap-4" onSubmit={login}>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Correo administrativo
                  <span className="login-input-wrap">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      className="login-input"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nombre@layeka.pe"
                      required
                    />
                  </span>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Contraseña
                  <span className="login-input-wrap">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      className="login-input pr-12"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Ingresa tu contraseña"
                      minLength={10}
                      required
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{error}</p>}
                <button
                  className="login-submit mt-1 flex h-12 items-center justify-center gap-2 rounded-xl px-4 font-bold text-stone-950"
                  type="submit"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? 'Ingresando…' : 'Ingresar al panel'}
                  {!isAuthenticating && <ChevronRight size={19} aria-hidden="true" />}
                </button>
              </form>
            </div>
            <p className="login-footer">Área exclusiva para el equipo autorizado de La Yeka.</p>
          </div>
        </section>
      </main>
    );
  return (
    <main className="admin-shell-enter h-[100dvh] overflow-hidden bg-[#f7f8fc] font-sans text-slate-950">
      <header className="sticky top-0 z-40 border-b border-amber-400/35 bg-[#101010] text-white shadow-[0_5px_18px_rgba(0,0,0,0.22)]">
        <div className="relative flex h-[68px] w-full items-center justify-between gap-3 px-4 sm:px-6">
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-400/70 via-amber-200/20 to-transparent" />
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 bg-[#1d1d1d] px-1 shadow-inner shadow-black/40 sm:h-11 sm:w-14">
              <img src={brandLogo} alt="La Yeka" className="max-h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-300 sm:text-xs">
                LA YEKA · ADMINISTRACIÓN
              </p>
              <h1 className="mt-0.5 text-sm font-semibold text-white sm:text-[15px]">
                Hola, {user}
              </h1>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <div
              className="hidden items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 lg:flex"
              title={
                lastSync
                  ? `Última sincronización: ${lastSync.toLocaleTimeString('es-PE')}`
                  : 'Conectando actualización automática'
              }
            >
              <span className="size-2 animate-pulse rounded-full bg-emerald-300" />
              En vivo
            </div>
            <button
              aria-label="Notificaciones"
              title="Notificaciones"
              onClick={() => setAlertsOpen((open) => !open)}
              className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-400/10"
            >
              <Bell size={18} />
              {alerts.length > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#4169ff] px-1 text-[10px] font-black text-white">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>
            {alertsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">Alertas operativas</p>
                    <p className="text-xs text-slate-500">Requieren atención del equipo.</p>
                  </div>
                  <button
                    onClick={() => {
                      setAlertsOpen(false);
                      void refreshAlerts();
                    }}
                    className="text-xs font-semibold text-[#4169ff]"
                  >
                    Actualizar
                  </button>
                </div>
                {alerts.length ? (
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => {
                          setView(alert.view);
                          setAlertsOpen(false);
                        }}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold">{alert.title}</p>
                          <time className="shrink-0 text-[10px] text-slate-400">
                            {new Date(alert.createdAt).toLocaleDateString('es-PE')}
                          </time>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{alert.description}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-slate-500">
                    No hay alertas pendientes.
                  </p>
                )}
              </div>
            )}
            <button
              onClick={logout}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/45 bg-amber-400 px-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white p-4 xl:top-[68px] xl:flex xl:h-[calc(100vh-68px)] ${sidebarCompact ? 'xl:w-20' : 'xl:w-60'}`}
      >
        <div className="mb-4 hidden items-center justify-between px-2 xl:flex">
          {!sidebarCompact && (
            <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">OPERACIÓN</p>
          )}
          <button
            aria-label="Contraer menú"
            onClick={() => setSidebarCompact((value) => !value)}
            className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            {sidebarCompact ? <Menu size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="grid gap-1">
          {(
            [
              { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
              { id: 'products', label: 'Catálogo', icon: Package },
              { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
              { id: 'cash', label: 'Caja', icon: DollarSign },
              { id: 'claims', label: 'Reclamos', icon: ClipboardList },
              { id: 'settings', label: 'Configuración', icon: Settings2 },
              { id: 'team', label: 'Equipo', icon: UsersRound },
              { id: 'audit', label: 'Actividad', icon: ScrollText },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
              }}
              title={sidebarCompact ? label : undefined}
              aria-label={label}
              className={`admin-nav-item flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${view === id ? 'bg-[#eef2ff] text-[#4169ff]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'} ${sidebarCompact ? 'justify-center xl:px-0' : ''}`}
            >
              <Icon size={18} />
              <span className={sidebarCompact ? 'xl:hidden' : ''}>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section
        className={`flex h-[calc(100dvh-68px)] min-w-0 flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 xl:pb-8 ${view === 'products' ? 'overflow-hidden' : 'overflow-y-auto'} ${sidebarCompact ? 'xl:ml-20' : 'xl:ml-60'}`}
      >
        {error && (
          <p
            role="alert"
            className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
          >
            <TriangleAlert size={18} />
            {error}
          </p>
        )}
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-[#eef2ff] px-4 py-3 text-sm font-medium text-[#3156d8]"
          >
            <span>{notice}</span>
            <button
              aria-label="Cerrar aviso"
              onClick={() => setNotice('')}
              className="rounded p-1 hover:bg-white"
            >
              <X size={16} />
            </button>
          </div>
        )}
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
                      : view === 'cash'
                        ? 'Caja por turno'
                    : view === 'claims'
                      ? 'Libro de reclamaciones'
                      : view === 'settings'
                        ? 'Configuración del negocio'
                        : view === 'team'
                          ? 'Equipo administrativo'
                          : 'Historial de actividad'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Actualizando…' : 'Actualizar datos'}
            </button>
            {view === 'products' && (
              <>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#aebdff] hover:bg-[#eef2ff]"
                >
                  <Package size={16} /> Categorías
                </button>
                <button
                  onClick={() => openProductForm()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4169ff] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3156d8]"
                >
                  <Plus size={16} /> Nuevo producto
                </button>
              </>
            )}
          </div>
        </div>
        {view === 'dashboard' && (
          <DashboardPage
            dashboard={dashboard}
            loading={loading}
            onOrders={() => setView('orders')}
            range={reportRange}
            onRange={setReportRange}
          />
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
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  size={18}
                />
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white"
                  placeholder="Buscar por producto o ingrediente"
                />
              </label>
              <label className="relative">
                <Filter
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  size={16}
                />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-amber-400"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={availabilityFilter}
                onChange={(event) =>
                  setAvailabilityFilter(event.target.value as 'all' | 'available' | 'paused')
                }
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
              >
                <option value="all">Todo el estado</option>
                <option value="available">Disponibles</option>
                <option value="paused">Pausados</option>
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/30 sm:p-4">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(205px,1fr))] gap-4">
                {loading ? (
                  <div className="col-span-full">
                    <ContentSkeleton variant="cards" />
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <article
                      className="admin-card-motion group overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 transition duration-200 hover:border-[#aebdff] hover:shadow-md hover:shadow-blue-100/70"
                      key={product.id}
                    >
                      <div className="relative grid aspect-[1.35/0.9] place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                        {product.imagePath ? (
                          <img
                            src={product.imagePath}
                            alt={product.name}
                            className="size-full object-cover transition duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <UtensilsCrossed size={30} />
                        )}
                        <span
                          className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold ${product.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {product.isAvailable ? 'Disponible' : 'Pausado'}
                        </span>
                      </div>
                      <div className="px-1 pb-1 pt-3">
                        <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                        <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-slate-500">
                          <span className="font-semibold text-[#4169ff]">
                            {product.category?.name || 'Sin categoría'}
                          </span>
                          {product.description ? ` · ${product.description}` : ''}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-base font-bold text-slate-950">
                            S/ {Number(product.price).toFixed(2)}
                          </span>
                          <button
                            onClick={() =>
                              update('products', product.id, { isAvailable: !product.isAvailable })
                            }
                            disabled={savingId === product.id}
                            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${product.isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {product.isAvailable ? 'Pausar' : 'Activar'}
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                          <input
                            aria-label={`Precio de ${product.name}`}
                            className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold outline-none ring-[#4169ff] focus:bg-white focus:ring-2"
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={draftPrices[product.id] ?? product.price}
                            onChange={(event) =>
                              setDraftPrices((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                          />
                          {Number(draftPrices[product.id] ?? product.price) !==
                            Number(product.price) && (
                            <button
                              title="Guardar precio"
                              onClick={() =>
                                update('products', product.id, {
                                  price: Number(draftPrices[product.id]),
                                })
                              }
                              disabled={savingId === product.id}
                              className="h-8 rounded-md bg-[#4169ff] px-2 text-xs font-semibold text-white hover:bg-[#3156d8]"
                            >
                              Guardar
                            </button>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openProductForm(product)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#aebdff] hover:bg-[#eef2ff]"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          <button
                            onClick={() => deleteProduct(product)}
                            disabled={savingId === product.id}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {!loading && filteredProducts.length === 0 && (
                <Empty text="No encontramos productos con esos filtros." />
              )}
            </div>
          </div>
        )}
        {view === 'orders' && (
          <div className="grid gap-4">
            <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/30 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  value={orderQuery}
                  onChange={(event) => { setOrderQuery(event.target.value); setOrderPage(1); }}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white"
                  placeholder="Buscar cliente, celular, producto o YEKA-000123"
                />
              </label>
              <select value={orderStatusFilter} onChange={(event) => { setOrderStatusFilter(event.target.value); setOrderPage(1); }} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-400">
                <option value="">Todos los estados</option>
                {statusOptions.orders.map((status) => <option key={status} value={status}>{labels[status]}</option>)}
              </select>
              <select value={orderPaymentFilter} onChange={(event) => { setOrderPaymentFilter(event.target.value); setOrderPage(1); }} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-400">
                <option value="">Todo pago</option>
                <option value="PENDING">Pago pendiente</option>
                <option value="VERIFIED">Pago validado</option>
                <option value="REJECTED">Pago rechazado</option>
              </select>
              <select value={orderFulfillmentFilter} onChange={(event) => { setOrderFulfillmentFilter(event.target.value); setOrderPage(1); }} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-400">
                <option value="">Delivery y recojo</option>
                <option value="DELIVERY">Delivery</option>
                <option value="PICKUP">Recojo en local</option>
              </select>
              <button onClick={() => void exportOrders()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
                <Download size={16} /> Exportar
              </button>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{orderTable.total} pedido{orderTable.total === 1 ? '' : 's'} encontrado{orderTable.total === 1 ? '' : 's'} · Página {orderTable.page} de {orderTable.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={orderTable.page <= 1} onClick={() => setOrderPage((page) => Math.max(1, page - 1))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                <button disabled={orderTable.page >= orderTable.totalPages} onClick={() => setOrderPage((page) => Math.min(orderTable.totalPages, page + 1))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
              </div>
            </div>
            <div className="order-mobile-tabs" role="tablist" aria-label="Etapas de los pedidos">
              {operationColumns.map((column) => (
                <button
                  key={column.title}
                  type="button"
                  role="tab"
                  aria-selected={mobileOrderColumn === column.title}
                  className={mobileOrderColumn === column.title ? 'is-active' : ''}
                  onClick={() => setMobileOrderColumn(column.title)}
                >
                  <span>{column.title}</span>
                  <b>{column.orders.length}</b>
                </button>
              ))}
            </div>
          <div className="order-board">
            {loading ? (
              <div className="xl:col-span-4">
                <ContentSkeleton />
              </div>
            ) : orders.length === 0 ? (
              <div className="xl:col-span-4">
                <Empty text="Aún no hay pedidos registrados." />
              </div>
            ) : (
              operationColumns.map((column) => (
                <section
                  key={column.title}
                  className={`order-column border-t-4 ${column.tone} ${
                    mobileOrderColumn === column.title ? 'is-mobile-active' : ''
                  }`}
                >
                  <div className="order-column-header">
                    <div>
                      <p className="order-column-label">OPERACIÓN</p>
                      <h3>{column.title}</h3>
                    </div>
                    <span className="order-column-count">{column.orders.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {column.orders.map((order) => (
                      <article className="order-card admin-card-motion" key={order.id}>
                        <div className="order-card-layout">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-black text-slate-950">
                                {order.customerName || 'Cliente sin nombre'} · S/{' '}
                                {Number(order.total).toFixed(2)}
                              </p>
                              <span className="shrink-0 font-mono text-[10px] text-slate-400">
                                YEKA-{String(order.orderNumber).padStart(6, '0')}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-stone-500">
                              {order.customerPhone} ·{' '}
                              {new Date(order.createdAt).toLocaleString('es-PE')}
                            </p>
                            <p className="order-card-badges">
                              <span>{labels[order.fulfillment]}</span>
                              <span>{labels[order.paymentMethod]}</span>
                              <span
                                className={
                                  order.paymentStatus === 'VERIFIED'
                                    ? 'is-verified'
                                    : order.paymentStatus === 'REJECTED'
                                      ? 'is-rejected'
                                      : 'is-pending'
                                }
                              >
                                Pago {labels[order.paymentStatus]}
                              </span>
                            </p>
                            {order.fulfillment === 'DELIVERY' && (
                              <p className="mt-1 text-xs text-stone-500">
                                {order.address} · {order.district}
                              </p>
                            )}
                            <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-medium text-slate-700">
                              {order.items
                                .map((item) => `${item.quantity}× ${item.productName}`)
                                .join(', ')}
                            </p>
                            <div className="order-payment">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p>Control de pago</p>
                                {order.paymentProofUrl && (
                                  <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">
                                    Ver voucher Yape
                                  </a>
                                )}
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                                <input
                                  aria-label={`Referencia de pago de pedido ${order.orderNumber}`}
                                  value={paymentReferences[order.id] ?? ''}
                                  onChange={(event) =>
                                    setPaymentReferences((current) => ({
                                      ...current,
                                      [order.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={
                                    order.paymentMethod === 'YAPE'
                                      ? 'Código Yape'
                                      : 'Referencia opcional'
                                  }
                                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#4169ff]"
                                />
                                <select
                                  aria-label="Estado de pago"
                                  value={paymentStatuses[order.id] || order.paymentStatus}
                                  onChange={(event) =>
                                    setPaymentStatuses((current) => ({
                                      ...current,
                                      [order.id]: event.target.value as Order['paymentStatus'],
                                    }))
                                  }
                                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-[#4169ff]"
                                >
                                  <option value="PENDING">Pendiente</option>
                                  <option value="VERIFIED">Validado</option>
                                  <option value="REJECTED">Rechazado</option>
                                </select>
                                <button
                                  onClick={() => void savePayment(order)}
                                  disabled={savingId === order.id}
                                  className="h-9 rounded-md border border-[#aebdff] bg-white px-3 text-xs font-bold text-[#3156d8] hover:bg-[#eef2ff] disabled:opacity-50"
                                >
                                  Guardar pago
                                </button>
                              </div>
                            </div>
                            {order.statusEvents.length > 0 && (
                              <details className="mt-3 text-xs">
                                <summary className="cursor-pointer font-bold text-slate-600">
                                  Historial de estado ({order.statusEvents.length})
                                </summary>
                                <ol className="mt-2 grid gap-1 border-l border-slate-200 pl-3">
                                  {order.statusEvents.map((event) => (
                                    <li key={event.id}>
                                      <span className="font-semibold">
                                        {event.fromStatus ? `${labels[event.fromStatus]} → ` : ''}
                                        {labels[event.toStatus]}
                                      </span>
                                      {event.reason ? ` · ${event.reason}` : ''}
                                      <span className="text-slate-400">
                                        {' '}
                                        · {new Date(event.createdAt).toLocaleString('es-PE')}
                                        {event.changedBy
                                          ? ` · ${event.changedBy.name || event.changedBy.email}`
                                          : ''}
                                      </span>
                                    </li>
                                  ))}
                                </ol>
                              </details>
                            )}
                          </div>
                          <div className="order-actions">
                            <Status
                              value={order.status}
                              options={statusOptions.orders}
                              onChange={(status) => {
                                if (status === 'CANCELLED') {
                                  setCancellingOrder(order);
                                  setCancelReason('');
                                  return;
                                }
                                update('orders', order.id, { status });
                              }}
                            />
                            {nextOrderAction[order.status] && (
                              <button
                                onClick={() =>
                                  update('orders', order.id, {
                                    status: nextOrderAction[order.status].status,
                                  })
                                }
                                disabled={savingId === order.id}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4169ff] px-3 py-2 text-sm font-bold text-white hover:bg-[#3156d8] disabled:cursor-wait disabled:opacity-60"
                              >
                                <CheckCircle2 size={15} /> {nextOrderAction[order.status].label}
                              </button>
                            )}
                            <button
                              onClick={() => openWhatsApp(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                              <ExternalLink size={15} /> WhatsApp
                            </button>
                            <button
                              onClick={() => printOrder(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                            >
                              <Printer size={15} /> Comanda / PDF
                            </button>
                            {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                              <button
                                onClick={() => {
                                  setCancellingOrder(order);
                                  setCancelReason('');
                                }}
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                              >
                                Cancelar pedido
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                    {column.orders.length === 0 && (
                      <p className="rounded-xl bg-white/70 p-5 text-center text-sm text-stone-400">
                        Sin pedidos
                      </p>
                    )}
                  </div>
                </section>
              ))
            )}
          </div>
          </div>
        )}
        {view === 'cash' && (
          <CashPage
            data={cashData}
            saving={savingId === 'cash'}
            onOpen={(amount, notes) => void openCashShift(amount, notes)}
            onClose={(amount, notes) => void closeCashShift(amount, notes)}
          />
        )}
        {view === 'claims' && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/30">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'Todos'],
                    ['RECEIVED', 'Recibidos'],
                    ['IN_REVIEW', 'En revisión'],
                    ['RESOLVED', 'Cerrados'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setClaimFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${claimFilter === value ? 'bg-[#4169ff] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {label}{' '}
                    {value === 'all'
                      ? claims.length
                      : claims.filter((claim) => claim.status === value).length}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Responder y cerrar deja constancia en el expediente.
              </p>
            </div>
            {loading ? (
              <ContentSkeleton />
            ) : filteredClaims.length === 0 ? (
              <Empty text="No hay reclamos en este estado." />
            ) : (
              filteredClaims.map((claim) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30"
                  key={claim.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">
                          {claim.customerName} · {labels[claim.kind]}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400">
                          #{claim.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {claim.email} · {claim.phone} · DNI/Doc. {claim.document}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        Recibido: {new Date(claim.createdAt).toLocaleString('es-PE')}
                        {claim.orderReference ? ` · Pedido: ${claim.orderReference}` : ''}
                      </p>
                    </div>
                    <Status
                      value={claim.status}
                      options={statusOptions.claims}
                      onChange={(status) =>
                        void saveClaim(claim, {
                          status,
                          adminResponse: claimDrafts[claim.id] || undefined,
                        })
                      }
                    />
                  </div>
                  <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">
                        DETALLE DECLARADO
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{claim.detail}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">
                        SOLUCIÓN SOLICITADA
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {claim.requestedSolution}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <label className="grid gap-1.5 text-sm font-bold text-slate-800">
                      Respuesta administrativa
                      <textarea
                        value={claimDrafts[claim.id] ?? ''}
                        onChange={(event) =>
                          setClaimDrafts((current) => ({
                            ...current,
                            [claim.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        maxLength={2000}
                        placeholder="Indica la respuesta y solución propuesta para el cliente."
                        className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none ring-[#4169ff] focus:ring-2"
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {claim.respondedAt
                          ? `Última respuesta: ${new Date(claim.respondedAt).toLocaleString('es-PE')}`
                          : 'Aún no se registró una respuesta.'}
                        {claim.resolvedAt
                          ? ` · Cerrado: ${new Date(claim.resolvedAt).toLocaleString('es-PE')}`
                          : ''}
                      </p>
                      <button
                        onClick={() =>
                          void saveClaim(claim, { adminResponse: claimDrafts[claim.id] || null })
                        }
                        disabled={savingId === claim.id || !claimDrafts[claim.id]?.trim()}
                        className="h-9 rounded-lg bg-[#4169ff] px-3 text-sm font-bold text-white hover:bg-[#3156d8] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingId === claim.id ? 'Guardando…' : 'Guardar respuesta'}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
        {view === 'settings' && (
          <form
            onSubmit={saveStoreSettings}
            className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">OPERACIÓN</p>
                <h3 className="mt-1 text-xl font-bold">Datos visibles del negocio</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Centraliza la información de contacto, delivery y atención al cliente.
                </p>
              </div>
              {storeSettings?.updatedAt && (
                <p className="text-xs text-slate-400">
                  Actualizado: {new Date(storeSettings.updatedAt).toLocaleString('es-PE')}
                </p>
              )}
            </div>
            {loading && !storeSettings ? (
              <div className="py-10">
                <ContentSkeleton />
              </div>
            ) : (
              storeSettings && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">
                    Nombre comercial
                    <input
                      name="businessName"
                      defaultValue={storeSettings.businessName}
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold">
                    WhatsApp de pedidos
                    <input
                      name="whatsapp"
                      defaultValue={storeSettings.whatsapp}
                      required
                      inputMode="tel"
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                    <span className="text-xs font-normal text-slate-500">
                      Usa código de país, por ejemplo 51974121550.
                    </span>
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold">
                    Distrito
                    <input
                      name="district"
                      defaultValue={storeSettings.district}
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">
                    Dirección del local
                    <input
                      name="address"
                      defaultValue={storeSettings.address}
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold">
                    Horario de atención
                    <input
                      name="openingHours"
                      defaultValue={storeSettings.openingHours}
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold">
                    Mensaje de delivery
                    <textarea
                      name="deliveryNote"
                      defaultValue={storeSettings.deliveryNote}
                      required
                      rows={3}
                      className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                </div>
              )
            )}
            {storeSettings && (
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <button
                  disabled={savingId === 'settings'}
                  className="h-10 rounded-lg bg-[#4169ff] px-5 text-sm font-bold text-white hover:bg-[#3156d8] disabled:opacity-60"
                >
                  {savingId === 'settings' ? 'Guardando…' : 'Guardar configuración'}
                </button>
              </div>
            )}
          </form>
        )}
        {view === 'team' && (
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
              <div>
                <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">ACCESOS</p>
                <h3 className="mt-1 text-xl font-bold">Equipo administrativo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Solo las cuentas activas pueden ingresar y gestionar la operación.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAdmin(null);
                  setShowTeamForm(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4169ff] px-4 text-sm font-bold text-white hover:bg-[#3156d8]"
              >
                <Plus size={16} /> Nuevo acceso
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
              {loading ? (
                <div className="p-5">
                  <ContentSkeleton />
                </div>
              ) : (
                team.map((member) => (
                  <article
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 last:border-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{member.name || 'Sin nombre'}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {member.isActive ? 'Activo' : 'Desactivado'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Creado: {new Date(member.createdAt).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingAdmin(member);
                          setShowTeamForm(true);
                        }}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        disabled={savingId === member.id}
                        onClick={() => void toggleAdminUser(member)}
                        className={`h-9 rounded-lg px-3 text-sm font-semibold ${member.isActive ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      >
                        {member.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </article>
                ))
              )}
              {!loading && team.length === 0 && (
                <Empty text="Aún no hay cuentas administrativas." />
              )}
            </div>
          </div>
        )}
        {view === 'audit' && (
          <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
            <div className="border-b border-slate-100 p-5">
              <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">TRAZABILIDAD</p>
              <h3 className="mt-1 text-xl font-bold">Actividad administrativa</h3>
              <p className="mt-1 text-sm text-slate-500">
                Últimas 100 acciones relevantes registradas por el equipo.
              </p>
            </div>
            {loading ? (
              <div className="p-5">
                <ContentSkeleton />
              </div>
            ) : auditLogs.length ? (
              <div>
                {auditLogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex gap-4 border-b border-slate-100 p-5 last:border-0"
                  >
                    <div className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[#4169ff]">
                      <ScrollText size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-900">
                          {entry.detail || `${entry.action} · ${entry.entityType}`}
                        </p>
                        <time className="text-xs text-slate-400">
                          {new Date(entry.createdAt).toLocaleString('es-PE')}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.admin?.name || entry.admin?.email || 'Administrador'} ·{' '}
                        {entry.action === 'CREATE' ? 'Creación' : 'Actualización'} de{' '}
                        {entry.entityType === 'TEAM_MEMBER'
                          ? 'acceso de equipo'
                          : 'configuración del negocio'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Aún no hay actividad registrada. Los próximos cambios administrativos aparecerán aquí." />
            )}
          </div>
        )}
        {showProductForm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          >
            <form
              key={editingProduct?.id || 'new'}
              onSubmit={saveProduct}
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">CATÁLOGO</p>
                  <h3 id="product-dialog-title" className="mt-1 text-xl font-bold">
                    {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                  Nombre
                  <input
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    minLength={2}
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Precio (S/)
                  <input
                    name="price"
                    defaultValue={editingProduct?.price}
                    required
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Categoría
                  <select
                    name="categoryId"
                    defaultValue={editingProduct?.category?.id || ''}
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                  Descripción
                  <textarea
                    name="description"
                    defaultValue={editingProduct?.description || ''}
                    rows={3}
                    className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                  Imagen del producto
                  <span className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 font-normal text-slate-600">
                    <Upload size={18} className="text-[#4169ff]" />
                    <input
                      aria-label="Archivo de imagen"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setProductImage(event.target.files?.[0] || null)}
                      className="min-w-0 text-sm"
                    />
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    JPG, PNG o WEBP; máximo 4 MB.{' '}
                    {productImage
                      ? `Seleccionada: ${productImage.name}`
                      : editingProduct?.imagePath
                        ? 'Conservará la imagen actual si no eliges otra.'
                        : 'Si no cargas una, se mostrará el ícono predeterminado.'}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                  <input
                    name="isAvailable"
                    type="checkbox"
                    defaultChecked={editingProduct ? editingProduct.isAvailable : true}
                    className="size-4 accent-[#4169ff]"
                  />{' '}
                  Disponible para la venta
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  disabled={savingProduct}
                  className="h-10 rounded-lg bg-[#4169ff] px-5 text-sm font-semibold text-white hover:bg-[#3156d8] disabled:opacity-60"
                >
                  {savingProduct
                    ? 'Guardando…'
                    : editingProduct
                      ? 'Guardar cambios'
                      : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        )}
        {showCategoryManager && (
          <CategoryManagerDialog
            categories={categories}
            savingId={savingCategoryId}
            onClose={() => setShowCategoryManager(false)}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}
        {showTeamForm && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
          >
            <form
              onSubmit={saveAdminUser}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">EQUIPO</p>
                  <h3 className="mt-1 text-xl font-bold">
                    {editingAdmin ? 'Editar acceso' : 'Nuevo acceso administrativo'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => {
                    setShowTeamForm(false);
                    setEditingAdmin(null);
                  }}
                  className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-1.5 text-sm font-bold">
                  Nombre
                  <input
                    name="name"
                    defaultValue={editingAdmin?.name || ''}
                    required
                    minLength={2}
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  />
                </label>
                {!editingAdmin && (
                  <label className="grid gap-1.5 text-sm font-bold">
                    Correo electrónico
                    <input
                      name="email"
                      type="email"
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                    />
                  </label>
                )}
                <label className="grid gap-1.5 text-sm font-bold">
                  {editingAdmin ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'}
                  <input
                    name="password"
                    type="password"
                    required={!editingAdmin}
                    minLength={10}
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal outline-none ring-[#4169ff] focus:ring-2"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Mínimo 10 caracteres. Compártela por un canal seguro.
                  </span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeamForm(false);
                    setEditingAdmin(null);
                  }}
                  className="h-10 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  disabled={savingId === 'team'}
                  className="h-10 rounded-lg bg-[#4169ff] px-5 text-sm font-bold text-white hover:bg-[#3156d8] disabled:opacity-60"
                >
                  {savingId === 'team'
                    ? 'Guardando…'
                    : editingAdmin
                      ? 'Guardar cambios'
                      : 'Crear acceso'}
                </button>
              </div>
            </form>
          </div>
        )}
        {cancellingOrder && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4"
          >
            <form
              onSubmit={cancelOrder}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.15em] text-red-600">
                    PEDIDO YEKA-{String(cancellingOrder.orderNumber).padStart(6, '0')}
                  </p>
                  <h3 id="cancel-order-title" className="mt-1 text-xl font-bold">
                    Cancelar pedido
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    El motivo quedará registrado en el historial operativo.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setCancellingOrder(null)}
                  className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <label className="mt-5 grid gap-1.5 text-sm font-bold">
                Motivo de cancelación
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  required
                  minLength={5}
                  maxLength={300}
                  rows={4}
                  placeholder="Ej.: Cliente canceló el pedido antes de la preparación."
                  className="resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none ring-red-400 focus:ring-2"
                />
              </label>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="h-10 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Volver
                </button>
                <button
                  disabled={savingId === cancellingOrder.id || cancelReason.trim().length < 5}
                  className="h-10 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {savingId === cancellingOrder.id ? 'Cancelando…' : 'Confirmar cancelación'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-40 flex items-center gap-2 xl:hidden"
      >
        <div className="grid min-w-0 flex-1 grid-cols-4 rounded-[1.35rem] border border-white/80 bg-white/75 px-1 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
          {(
            [
              { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
              { id: 'products', label: 'Catálogo', icon: Package },
              { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
              { id: 'claims', label: 'Reclamos', icon: ClipboardList },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setMobileMoreOpen(false);
              }}
              className={`grid min-h-12 place-items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition ${view === id ? 'bg-[#eef2ff]/95 text-[#4169ff] shadow-sm' : 'text-slate-500 hover:bg-white/70'}`}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Ver más opciones"
          aria-expanded={mobileMoreOpen}
          onClick={() => setMobileMoreOpen((open) => !open)}
          className={`grid size-12 shrink-0 place-items-center rounded-full border border-white/70 text-white shadow-[0_10px_24px_rgba(15,23,42,0.25)] backdrop-blur-xl transition hover:scale-105 active:scale-95 ${mobileMoreOpen ? 'rotate-45 bg-[#4169ff]' : 'bg-slate-950/90'}`}
        >
          <Plus size={22} />
        </button>
      </nav>
      {mobileMoreOpen && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-40 grid w-56 grid-cols-2 gap-2 rounded-[1.35rem] border border-white/80 bg-white/80 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur-2xl xl:hidden">
          {(
            [
              { id: 'cash', label: 'Caja', icon: DollarSign },
              { id: 'settings', label: 'Configuración', icon: Settings2 },
              { id: 'team', label: 'Equipo', icon: UsersRound },
              { id: 'audit', label: 'Actividad', icon: ScrollText },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                setMobileMoreOpen(false);
              }}
              className={`grid min-h-20 place-items-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-bold transition ${view === id ? 'bg-[#4169ff] text-white shadow-md shadow-blue-500/20' : 'bg-white/65 text-slate-600 hover:bg-white'}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Admin />);
