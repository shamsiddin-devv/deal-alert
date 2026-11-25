import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { apiPath, send } from '@/lib/api';
import type { AlertPage, Preferences } from '@/lib/contracts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/base/Button';
import { EmptyState } from '@/components/base/Bits';
import { Switch } from '@/components/base/Controls';
import { money, pct, relTime } from '@/lib/format';
import type { AlertType } from '@/lib/types';

const visual: Record<AlertType, { icon: string; className: string }> = {
  'price-drop': { icon: 'ri-arrow-down-line', className: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  target: { icon: 'ri-focus-3-line', className: 'bg-accent-500/12 text-accent-700 dark:text-accent-400' },
  'historic-low': { icon: 'ri-award-line', className: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  'back-in-stock': { icon: 'ri-store-2-line', className: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' },
  'price-increase': { icon: 'ri-arrow-up-line', className: 'bg-danger-500/10 text-danger-600' },
  unavailable: { icon: 'ri-forbid-2-line', className: 'bg-danger-500/10 text-danger-600' },
  'better-offer': { icon: 'ri-arrow-left-right-line', className: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' },
};

const tabs: { key: string; label: string; types: AlertType[] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'drops', label: 'Price drops', types: ['price-drop', 'better-offer'] },
  { key: 'target', label: 'Target reached', types: ['target'] },
  { key: 'low', label: 'Historical low', types: ['historic-low'] },
  { key: 'stock', label: 'Back in stock', types: ['back-in-stock'] },
  { key: 'increase', label: 'Price increases', types: ['price-increase'] },
  { key: 'unavailable', label: 'Unavailable', types: ['unavailable'] },
];

export default function AlertsPage() {
  const { products, markRead, markAllRead, removeAlert, pushToast, perform, revision, refresh } = useWorkspace();
  const [tab, setTab] = useState('all');
  const [page,setPage]=useState(1);
  const preferences=useApiResource<Preferences>('/me/preferences',revision);
  const [prefs, setPrefs] = useState({
    drop: true,
    target: true,
    low: true,
    stock: true,
    increase: false,
    weekly: true,
  });

  const active = tabs.find((item) => item.key === tab) ?? tabs[0];
  const feed=useApiResource<AlertPage>(apiPath('/alerts',{page,pageSize:15,types:active.types.join(',')}),revision);
  const filtered=feed.data?.items ?? [];
  const unread=feed.data?.unread ?? 0;
  const counts=feed.data?.counts ?? {};
  const total=Object.values(counts).reduce((sum,count)=>sum+(count??0),0);
  const incoming=preferences.data;
  useEffect(()=>{if(incoming)setPrefs({drop:incoming.drop,target:incoming.target,low:incoming.low,stock:incoming.stock,increase:incoming.increases,weekly:incoming.digest});},[incoming]);

  return (
    <div className="space-y-4">
      <ApiStatus loading={feed.loading} error={feed.error ?? preferences.error} retry={refresh}/>
      {(feed.data?.totalPages ?? 1)>1 && <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button>
        <span>Page {page} of {feed.data?.totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page===feed.data?.totalPages} onClick={()=>setPage(page+1)}>Next</Button>
      </div>}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
            Alerts
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground-500">
            {unread} unread of {total} notifications · grouped so only meaningful events reach you
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon="ri-check-double-line"
          onClick={async () => {
            if(!await markAllRead())return;
            pushToast('All alerts marked as read', 'info');
          }}
          disabled={unread === 0}
        >
          Mark all as read
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-lg border border-background-200 bg-background-50 p-1">
            {tabs.map((item) => {
              const count = item.types.length === 0 ? total : item.types.reduce((sum,type)=>sum+(counts[type]??0),0);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {setTab(item.key);setPage(1);}}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors cursor-pointer ${
                    tab === item.key
                      ? 'bg-foreground-950 text-background-50'
                      : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded px-1 font-label text-[9.5px] ${
                      tab === item.key ? 'bg-background-50/20' : 'bg-background-200 text-foreground-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
            {filtered.length === 0 ? (
              <EmptyState
                icon="ri-notification-off-line"
                title="No alerts in this category"
                body="Alerts appear here when a monitored product meets one of your conditions. You can adjust the conditions from any product page."
                action={
                  <Link to="/app/products">
                    <Button variant="secondary" size="sm">
                      Review monitored products
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-background-200">
                {filtered.map((alert) => {
                  const product = products.find((item) => item.id === alert.productId);
                  const comparable=alert.newPrice!==null && alert.oldPrice!==null;
                  const diff = comparable ? alert.newPrice! - alert.oldPrice! : 0;
                  const style = visual[alert.type];
                  return (
                    <div
                      key={alert.id}
                      className={`flex flex-col gap-3 p-3.5 transition-colors sm:flex-row ${
                        alert.read ? 'hover:bg-background-100/50' : 'bg-primary-500/[0.03] hover:bg-primary-500/[0.06]'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.className}`}>
                        <i aria-hidden="true" className={`${style.icon} text-[15px]`}></i>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[12.5px] font-semibold text-foreground-950">{alert.title}</p>
                          {!alert.read && <span className="h-1.5 w-1.5 rounded-full bg-accent-500"></span>}
                          <span className="rounded-full border border-background-200 bg-background-100 px-1.5 py-0.5 text-[9.5px] font-medium text-foreground-500">
                            {alert.marketplace}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-foreground-600">{alert.message}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {comparable && alert.oldPrice !== alert.newPrice && (
                            <span className="font-label text-[11px] text-foreground-500">
                              <span className="line-through">{money(alert.oldPrice)}</span>
                              <i aria-hidden="true" className="ri-arrow-right-line mx-1 text-[10px] text-foreground-300"></i>
                              <span className="font-medium text-foreground-950">{money(alert.newPrice)}</span>
                            </span>
                          )}
                          {comparable && alert.oldPrice !== alert.newPrice && (
                            <span
                              className={`font-label text-[10.5px] ${
                                diff < 0 ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600'
                              }`}
                            >
                              {diff < 0 ? '−' : '+'}
                              {money(Math.abs(diff)).replace(' UZS', '')} · {pct((diff / (alert.oldPrice ?? 1)) * 100)}
                            </span>
                          )}
                          <span className="text-[10px] text-foreground-400">{relTime(alert.createdAt)}</span>
                          {product && (
                            <Link
                              to={`/app/products/${product.id}`}
                              className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-foreground-700 hover:text-primary-700 dark:hover:text-primary-400 cursor-pointer"
                            >
                              Open product
                              <i aria-hidden="true" className="ri-arrow-right-up-line text-[10px]"></i>
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 sm:flex-col sm:items-end">
                        <button
                          type="button"
                          onClick={async () => {
                            if(!await markRead(alert.id,!alert.read))return;
                            pushToast(alert.read ? 'Marked as unread' : 'Marked as read', 'info');
                          }}
                          aria-label="Toggle read state"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-800 cursor-pointer"
                        >
                          <i aria-hidden="true" className={`${alert.read ? 'ri-mail-unread-line' : 'ri-mail-open-line'} text-[13px]`}></i>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if(!await removeAlert(alert.id))return;
                            pushToast('Alert deleted', 'info');
                          }}
                          aria-label="Delete alert"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-400 hover:bg-danger-500/10 hover:text-danger-600 cursor-pointer"
                        >
                          <i aria-hidden="true" className="ri-delete-bin-line text-[13px]"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-[72px] lg:self-start">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-[13.5px] font-semibold text-foreground-950">Notification preferences</h2>
              <i aria-hidden="true" className="ri-settings-3-line text-[14px] text-foreground-400"></i>
            </div>
            <div className="mt-3 space-y-3">
              <Switch checked={prefs.drop} onChange={(next) => setPrefs({ ...prefs, drop: next })} label="Price drops" description="Any decrease of 3% or more." />
              <Switch checked={prefs.target} onChange={(next) => setPrefs({ ...prefs, target: next })} label="Target price" description="When your price is reached." />
              <Switch checked={prefs.low} onChange={(next) => setPrefs({ ...prefs, low: next })} label="Historical low" description="A new lowest recorded price." />
              <Switch checked={prefs.stock} onChange={(next) => setPrefs({ ...prefs, stock: next })} label="Availability" description="Back in stock or sold out." />
              <Switch checked={prefs.increase} onChange={(next) => setPrefs({ ...prefs, increase: next })} label="Price increases" description="Upward moves above 5%." />
              <div className="h-px bg-background-200"></div>
              <Switch checked={prefs.weekly} onChange={(next) => setPrefs({ ...prefs, weekly: next })} label="Weekly digest" description="A summary every Monday morning." />
            </div>
            <Button
              variant="secondary"
              size="sm"
              block
              className="mt-3"
              onClick={() => void perform(()=>send('PATCH','/me/preferences',{drop:prefs.drop,target:prefs.target,low:prefs.low,stock:prefs.stock,increases:prefs.increase,digest:prefs.weekly}),'Notification preferences saved')}
            >
              Save preferences
            </Button>
          </div>

          <div className="rounded-xl border border-background-200 bg-background-100 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Delivery channels</p>
            <div className="mt-2 space-y-1.5 text-[11.5px] text-foreground-600">
              <p className="flex items-center gap-2">
                <i aria-hidden="true" className="ri-mail-line text-[13px] text-foreground-400"></i>
                Email · verified
              </p>
              <p className="flex items-center gap-2">
                <i aria-hidden="true" className="ri-smartphone-line text-[13px] text-foreground-400"></i>
                Push · not configured
              </p>
              <p className="flex items-center gap-2">
                <i aria-hidden="true" className="ri-telegram-line text-[13px] text-foreground-400"></i>
                Telegram · not connected
              </p>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-foreground-400">
              Demo mode sends nothing outside the app. Channel settings will be connected in a later stage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}