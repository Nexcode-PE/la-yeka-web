import { ChefHat, Clock3, DollarSign, MapPin, PackageCheck, Truck } from 'lucide-react';
import type { CashShiftData, Order } from '../types/admin';

const orderCode = (order: Order) => `YEKA-${String(order.orderNumber).padStart(6, '0')}`;
const money = (value: string | number) => `S/ ${Number(value).toFixed(2)}`;

export function KitchenPage({
  orders,
  savingId,
  onStatus,
}: {
  orders: Order[];
  savingId: string;
  onStatus: (order: Order, status: 'PREPARING' | 'READY') => void;
}) {
  const kitchenOrders = orders.filter((order) => ['CONFIRMED', 'PREPARING'].includes(order.status));
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-orange-500 text-white"><ChefHat size={22} /></span>
          <div><p className="font-black">Comandas activas</p><p className="text-sm text-slate-600">Prioriza por hora de ingreso y marca cada etapa.</p></div>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold text-orange-700 sm:mt-0">{kitchenOrders.length} en cocina</span>
      </div>
      {kitchenOrders.length === 0 ? <EmptyKitchen /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kitchenOrders.map((order) => (
          <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div><p className="font-mono text-xs font-bold text-[#4169ff]">{orderCode(order)}</p><p className="mt-1 font-black">{order.customerName || 'Cliente'}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === 'PREPARING' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-800'}`}>{order.status === 'PREPARING' ? 'Preparando' : 'Confirmado'}</span>
            </div>
            <div className="p-4"><p className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={14} /> {new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
              <ul className="mt-4 grid gap-2">{order.items.map((item, index) => <li key={`${item.productName}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">{item.quantity}× {item.productName}</li>)}</ul>
              {order.status === 'PREPARING' && <p className="mt-3 text-xs text-slate-500">Al terminar, avisa que está listo para entrega.</p>}
              <button onClick={() => onStatus(order, order.status === 'CONFIRMED' ? 'PREPARING' : 'READY')} disabled={savingId === order.id} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#4169ff] text-sm font-bold text-white hover:bg-[#3156d8] disabled:opacity-60"><PackageCheck size={16} />{order.status === 'CONFIRMED' ? 'Iniciar preparación' : 'Marcar como listo'}</button>
            </div>
          </article>
        ))}</div>}
    </div>
  );
}

export function DeliveryPage({
  orders,
  savingId,
  onSave,
}: {
  orders: Order[];
  savingId: string;
  onSave: (order: Order, data: { deliveryDriver: string | null; deliveryFee: number; estimatedMinutes: number | null }) => void;
}) {
  const deliveryOrders = orders.filter((order) => order.fulfillment === 'DELIVERY' && !['DELIVERED', 'CANCELLED'].includes(order.status));
  return <div className="grid gap-4">
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:flex sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-sky-600 text-white"><Truck size={22} /></span><div><p className="font-black">Despacho y delivery</p><p className="text-sm text-slate-600">Asigna repartidor y registra la estimación operativa.</p></div></div><span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold text-sky-700 sm:mt-0">{deliveryOrders.length} por despachar</span></div>
    <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">El costo de delivery es un dato operativo por ahora; no modifica el total que ya vio el cliente.</p>
    {deliveryOrders.length === 0 ? <EmptyDelivery /> : <div className="grid gap-4 lg:grid-cols-2">{deliveryOrders.map((order) => <DeliveryCard key={order.id} order={order} saving={savingId === order.id} onSave={onSave} />)}</div>}
  </div>;
}

function DeliveryCard({ order, saving, onSave }: { order: Order; saving: boolean; onSave: (order: Order, data: { deliveryDriver: string | null; deliveryFee: number; estimatedMinutes: number | null }) => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(order, { deliveryDriver: String(data.get('driver') || '').trim() || null, deliveryFee: Number(data.get('fee') || 0), estimatedMinutes: data.get('eta') ? Number(data.get('eta')) : null }); }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold text-[#4169ff]">{orderCode(order)}</p><p className="mt-1 font-black">{order.customerName || 'Cliente'} · {money(order.total)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{order.status}</span></div>
    <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 shrink-0" size={15} />{order.address || 'Sin dirección'} · {order.district || 'Sin distrito'}</p>
    <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-medium">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-bold text-slate-600">Repartidor<input name="driver" defaultValue={order.deliveryDriver || ''} placeholder="Nombre" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-[#4169ff]" /></label><label className="grid gap-1 text-xs font-bold text-slate-600">Costo S/<input name="fee" type="number" min="0" step="0.5" defaultValue={Number(order.deliveryFee)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-[#4169ff]" /></label><label className="grid gap-1 text-xs font-bold text-slate-600">Estimado (min)<input name="eta" type="number" min="1" max="240" defaultValue={order.estimatedMinutes || ''} placeholder="Ej. 30" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-[#4169ff]" /></label></div>
    <p className={`mt-4 rounded-lg px-3 py-2 text-xs ${order.deliveryQuotedAt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{order.deliveryQuotedAt ? `Cotizado: productos ${money(order.total)} + delivery ${money(order.deliveryFee)} = ${money(Number(order.total) + Number(order.deliveryFee))}` : 'Sin cotizar: el cliente aún no debe realizar el pago de delivery.'}</p>
    <button disabled={saving} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-sm font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-60"><Truck size={16} />Guardar y cotizar delivery</button>
  </form>;
}

export function CashPage({ data, saving, onOpen, onClose }: { data: CashShiftData | null; saving: boolean; onOpen: (amount: number, notes: string) => void; onClose: (amount: number, notes: string) => void }) {
  const shift = data?.openShift;
  return <div className="grid max-w-5xl gap-4"><div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-white"><DollarSign size={22} /></span><div><p className="font-black">Caja por turno</p><p className="text-sm text-slate-600">Controla la apertura, cierre y ventas entregadas.</p></div></div></div>{shift ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Caja abierta</p><h3 className="mt-1 text-xl font-black">Desde {new Date(shift.openedAt).toLocaleString('es-PE')}</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">En operación</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Fondo inicial" value={money(shift.openingAmount)} /><Metric label="Efectivo entregado" value={money(shift.summary?.cash || 0)} /><Metric label="Yape validado" value={money(shift.summary?.yape || 0)} /></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onClose(Number(form.get('closingAmount') || 0), String(form.get('notes') || '')); }} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[12rem_minmax(0,1fr)_auto]"><label className="grid gap-1 text-xs font-bold">Cierre en efectivo<input required name="closingAmount" type="number" min="0" step="0.1" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#4169ff]" /></label><label className="grid gap-1 text-xs font-bold">Observación<textarea name="notes" defaultValue={shift.notes || ''} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4169ff]" /></label><button disabled={saving} className="self-end h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">Cerrar caja</button></form></section> : <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onOpen(Number(form.get('openingAmount') || 0), String(form.get('notes') || '')); }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-black">Abrir turno</p><p className="mt-1 text-sm text-slate-500">Registra el fondo inicial antes de empezar a vender.</p><div className="mt-4 grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto]"><label className="grid gap-1 text-xs font-bold">Fondo inicial S/<input required name="openingAmount" type="number" min="0" step="0.1" defaultValue="0" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#4169ff]" /></label><label className="grid gap-1 text-xs font-bold">Observación<textarea name="notes" placeholder="Ej. Turno noche" className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4169ff]" /></label><button disabled={saving} className="self-end h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Abrir caja</button></div></form>}<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-black">Últimos cierres</p>{data?.recent.length ? <div className="mt-3 divide-y divide-slate-100">{data.recent.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{new Date(item.openedAt).toLocaleDateString('es-PE')} · {new Date(item.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span><span className="font-semibold">Inicial {money(item.openingAmount)} · Cierre {money(item.closingAmount || 0)}</span></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Aún no hay cierres registrados.</p>}</section></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>; }
function EmptyKitchen() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No hay comandas pendientes de cocina.</div>; }
function EmptyDelivery() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No hay deliveries pendientes de asignación.</div>; }
