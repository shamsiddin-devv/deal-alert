import ProductImage from '@/components/base/ProductImage';
import { productView } from '@/lib/contracts';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { StatusPill, Delta, EmptyState, SectionHeader } from '@/components/base/Bits';
import { money, relTime, shortDate } from '@/lib/format';

const alertIcons: Record<string, { icon: string; className: string }> = {
  'price-drop': { icon: 'ri-arrow-down-line', className: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  target: { icon: 'ri-focus-3-line', className: 'bg-accent-500/12 text-accent-700 dark:text-accent-400' },
  'historic-low': { icon: 'ri-award-line', className: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  'back-in-stock': { icon: 'ri-store-2-line', className: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' },
  'price-increase': { icon: 'ri-arrow-up-line', className: 'bg-danger-500/10 text-danger-600' },
  unavailable: { icon: 'ri-forbid-2-line', className: 'bg-danger-500/10 text-danger-600' },
  'better-offer': { icon: 'ri-arrow-left-right-line', className: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' },
};

export function PriceActivity() {
  const { products, dashboard } = useWorkspace();
  const navigate = useNavigate();

  const rows=(dashboard?.recentEvents.items ?? []).slice(0,5).flatMap(event=>{
    const product=products.find(item=>item.id===event.productId);
    return product?[{product,event}]:[];
  });

  return (
    <div className="rounded-xl border border-background-200 bg-background-50 shadow-card">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Price activity"
          subtitle="Most recent recorded changes"
          action={
            <Link to="/app/history" className="text-[11.5px] font-medium text-foreground-600 hover:text-foreground-950 cursor-pointer">
              History
            </Link>
          }
        />
      </div>
      <div className="divide-y divide-background-200">
        {rows.length === 0 && (
          <EmptyState icon="ri-line-chart-line" title="No price changes yet" body="Once monitoring records a change it will appear here." />
        )}
        {rows.map(({ product, event }) => (
          <button
            key={event.id}
            type="button"
            onClick={() => navigate(`/app/products/${product.id}`)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background-100/70 cursor-pointer"
          >
            <ProductImage
              src={product.image || undefined}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground-900">{product.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-foreground-400">
                <span>{product.marketplace}</span>
                <span className="text-foreground-300">·</span>
                <span>{shortDate(event.date)}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-label text-[11.5px] text-foreground-800">
                <span className="text-foreground-400 line-through">{money(event.from)}</span>
              </p>
              <p className="font-label text-[11.5px] font-medium text-foreground-950">{money(event.to)}</p>
            </div>
            <div className="w-14 shrink-0 text-right">
              <Delta value={event.pct} className="text-[11px]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecentAlerts() {
  const { alerts, markRead } = useWorkspace();

  return (
    <div className="rounded-xl border border-background-200 bg-background-50 shadow-card">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Recent alerts"
          subtitle="Triggered by your conditions"
          action={
            <Link to="/app/alerts" className="text-[11.5px] font-medium text-foreground-600 hover:text-foreground-950 cursor-pointer">
              All alerts
            </Link>
          }
        />
      </div>
      <div className="divide-y divide-background-200">
        {alerts.slice(0, 4).map((alert) => {
          const visual = alertIcons[alert.type];
          return (
            <Link
              key={alert.id}
              to={`/app/products/${alert.productId}`}
              onClick={() => markRead(alert.id)}
              className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-background-100/70 cursor-pointer"
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${visual.className}`}>
                <i aria-hidden="true" className={`${visual.icon} text-[13px]`}></i>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-foreground-900">{alert.title}</span>
                  {!alert.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500"></span>}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-foreground-500">{alert.message}</span>
                <span className="mt-0.5 block text-[10px] text-foreground-400">{relTime(alert.createdAt)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function RecommendedDeals() {
  const { dashboard } = useWorkspace();
  const navigate = useNavigate();
  const deals=(dashboard?.recommended ?? []).map(productView);

  return (
    <div className="rounded-xl border border-background-200 bg-background-50 shadow-card">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Recommended deals"
          subtitle="Best evidence right now"
          action={
            <Link to="/app/deals" className="text-[11.5px] font-medium text-foreground-600 hover:text-foreground-950 cursor-pointer">
              Explore
            </Link>
          }
        />
      </div>
      <div className="divide-y divide-background-200">
        {deals.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => navigate(`/app/products/${product.id}`)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background-100/70 cursor-pointer"
          >
            <ProductImage
              src={product.image || undefined}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-md border border-background-200 object-cover object-top"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground-900">{product.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px]">
                <span className="font-label font-medium text-foreground-800">{money(product.price)}</span>
                <Delta value={product.changePct} className="text-[10.5px]" />
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-primary-500/20 bg-primary-500/[0.07] px-1.5 py-0.5 font-label text-[10.5px] font-semibold text-primary-700 dark:text-primary-400">
              {product.score}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecentlyTracked() {
  const { products } = useWorkspace();
  const navigate = useNavigate();
  const tracked = products.filter((product) => product.tracked).slice(0, 6);

  return (
    <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50 shadow-card">
      <div className="px-4 pt-4">
        <SectionHeader
          title="Recently tracked products"
          subtitle="Progress toward your target price"
          action={
            <Link to="/app/products" className="text-[11.5px] font-medium text-foreground-600 hover:text-foreground-950 cursor-pointer">
              Manage
            </Link>
          }
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-y border-background-200 bg-background-100/60">
              {['Product', 'Current', 'Target', 'Progress', 'Change', 'Status'].map((head) => (
                <th key={head} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracked.map((product) => {
              const span = Math.max(product.startPrice - product.targetPrice, 1);
              const progress = Math.min(100, Math.max(0, ((product.startPrice - product.price) / span) * 100));
              const reached = product.price <= product.targetPrice;
              return (
                <tr
                  key={product.id}
                  onClick={() => navigate(`/app/products/${product.id}`)}
                  className="cursor-pointer border-b border-background-200 last:border-0 transition-colors hover:bg-background-100/60"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <ProductImage
                        src={product.image || undefined}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-foreground-900">{product.title}</p>
                        <p className="truncate text-[10.5px] text-foreground-400">
                          {product.marketplace} · {product.condition}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-label text-[11.5px] font-medium text-foreground-950">
                    {money(product.price)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-label text-[11.5px] text-foreground-500">
                    {money(product.targetPrice)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-background-200">
                        <div
                          className={`h-full rounded-full ${reached ? 'bg-accent-500' : 'bg-primary-500'}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="font-label text-[10px] text-foreground-400">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Delta value={product.changePct} className="text-[11px]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={product.status} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}