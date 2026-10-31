import { ChevronRight } from 'lucide-react';
import { labels } from '../lib/admin-config';
import type { Dashboard } from '../types/admin';
import { DashboardSkeleton, Empty, Stat } from '../components/ui';

type Props = { dashboard: Dashboard | null; loading: boolean; onOrders: () => void };

export function DashboardPage({ dashboard, loading, onOrders }: Props) {
  if (loading && !dashboard) return <DashboardSkeleton />;
  if (!dashboard) return null;
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat value={`S/ ${dashboard.salesToday.toFixed(2)}`} label="Ventas de hoy" />
      <Stat value={dashboard.ordersToday} label="Pedidos de hoy" tone="green" />
      <Stat value={dashboard.pending} label="Por atender" tone="amber" />
      <Stat value={`${dashboard.availableProducts}/${dashboard.totalProducts}`} label="Productos activos" tone="gray" />
    </div>
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="font-black">Actividad reciente</p><p className="text-sm text-slate-500">Últimos pedidos recibidos</p></div><button onClick={onOrders} className="inline-flex items-center gap-1 text-sm font-semibold text-[#4169ff] hover:text-[#274ccf]">Ver pedidos <ChevronRight size={16}/></button></div>
      {dashboard.recentOrders.length ? dashboard.recentOrders.map((order) => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-0"><div><p className="font-bold">{order.customerName || 'Cliente sin nombre'} <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span></p><p className="text-sm text-slate-500">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</p></div><div className="text-right"><p className="font-black">S/ {Number(order.total).toFixed(2)}</p><p className="text-xs font-bold text-[#4169ff]">{labels[order.status]}</p></div></article>) : <Empty text="Todavía no hay pedidos para mostrar." />}
    </div>
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30"><p className="font-bold">Caja de hoy</p><p className="mt-1 text-sm text-slate-500">Ventas confirmadas por medio de pago.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(dashboard.paymentBreakdown).map(([method, total]) => <div key={method} className="rounded-lg border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">{labels[method]}</p><p className="mt-1 text-xl font-bold">S/ {total.toFixed(2)}</p></div>)}</div></div>
  </>;
}
