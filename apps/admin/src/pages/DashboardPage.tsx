import { ChevronRight, CircleDollarSign, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react';
import { labels } from '../lib/admin-config';
import type { Dashboard } from '../types/admin';
import { DashboardSkeleton, Empty, Stat } from '../components/ui';

type Range = 'today' | 'week' | 'month';
type Props = {
  dashboard: Dashboard | null;
  loading: boolean;
  onOrders: () => void;
  onPaymentReview: () => void;
  range: Range;
  onRange: (range: Range) => void;
};
const rangeLabels: Record<Range, string> = { today: 'Hoy', week: 'Esta semana', month: 'Este mes' };

export function DashboardPage({ dashboard, loading, onOrders, onPaymentReview, range, onRange }: Props) {
  if (loading && !dashboard) return <DashboardSkeleton />;
  if (!dashboard) return null;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/30">
        <div>
          <p className="text-sm font-bold text-slate-900">Resumen de ventas</p>
          <p className="text-xs text-slate-500">
            Datos reales de pedidos y cobros registrados en PostgreSQL.
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(Object.keys(rangeLabels) as Range[]).map((option) => (
            <button
              key={option}
              onClick={() => onRange(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${range === option ? 'bg-white text-[#4169ff] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {rangeLabels[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          value={`S/ ${dashboard.sales.toFixed(2)}`}
          label={`Cobrado: ${rangeLabels[range].toLowerCase()}`}
        />
        <Stat
          value={dashboard.orders}
          label={`Pedidos: ${rangeLabels[range].toLowerCase()}`}
          tone="green"
        />
        <Stat value={dashboard.paidOrders} label="Pedidos cobrados" tone="green" />
        <Stat value={`S/ ${dashboard.pendingPaymentAmount.toFixed(2)}`} label={`Por cobrar · ${dashboard.pendingPaymentOrders}`} tone="gray" />
        <Stat value={dashboard.pending} label="Por atender ahora" tone="amber" />
      </div>
      {dashboard.pendingPaymentOrders > 0 && (
        <button
          onClick={onPaymentReview}
          className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-left transition hover:border-amber-300 hover:shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-400 text-slate-950">
              <CircleDollarSign size={19} />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-900">
                Hay {dashboard.pendingPaymentOrders} pago{dashboard.pendingPaymentOrders === 1 ? '' : 's'} pendiente{dashboard.pendingPaymentOrders === 1 ? '' : 's'} de revisión
              </span>
              <span className="block text-xs text-slate-600">
                S/ {dashboard.pendingPaymentAmount.toFixed(2)} por confirmar o cobrar.
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-amber-800">
            Revisar <ChevronRight size={17} />
          </span>
        </button>
      )}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="font-black">Actividad reciente</p>
              <p className="text-sm text-slate-500">Últimos pedidos recibidos</p>
            </div>
            <button
              onClick={onOrders}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#4169ff] hover:text-[#274ccf]"
            >
              Ver pedidos <ChevronRight size={16} />
            </button>
          </div>
          {dashboard.recentOrders.length ? (
            dashboard.recentOrders.map((order) => (
              <article
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <div>
                  <p className="font-bold">
                    {order.customerName || 'Cliente sin nombre'}{' '}
                    <span className="font-mono text-xs text-slate-400">
                      YEKA-{String(order.orderNumber).padStart(6, '0')}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black">S/ {(Number(order.total) + Number(order.deliveryFee || 0)).toFixed(2)}</p>
                  <p className="text-xs font-bold text-[#4169ff]">{labels[order.status]}</p>
                </div>
              </article>
            ))
          ) : (
            <Empty text="Todavía no hay pedidos para mostrar." />
          )}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#4169ff]" />
            <div>
              <p className="font-black">Más pedidos</p>
              <p className="text-sm text-slate-500">Productos destacados del período</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {dashboard.topProducts.length ? (
              dashboard.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-xs font-black text-[#4169ff]">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-bold">{product.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{product.quantity} ud.</p>
                    <p className="text-xs text-slate-500">S/ {product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Aún no hay ventas en este período.
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#4169ff]" />
            <div>
              <p className="font-bold">Caja del período</p>
              <p className="mt-1 text-sm text-slate-500">Ventas confirmadas por medio de pago.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(dashboard.paymentBreakdown).map(([method, total]) => (
              <div key={method} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{labels[method]}</p>
                <p className="mt-1 text-xl font-bold">S/ {total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} className="text-[#4169ff]" />
            <div>
              <p className="font-bold">Estado de pedidos</p>
              <p className="mt-1 text-sm text-slate-500">Distribución del período seleccionado.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(dashboard.statusBreakdown)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <div key={status} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{labels[status]}</p>
                  <p className="text-lg font-black">{count}</p>
                </div>
              ))}
            {Object.values(dashboard.statusBreakdown).every((count) => count === 0) && (
              <p className="col-span-2 py-5 text-center text-sm text-slate-500">
                Sin pedidos en este período.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
