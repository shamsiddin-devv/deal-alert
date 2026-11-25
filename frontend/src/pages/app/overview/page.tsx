import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { emptyHistory, type History } from '@/lib/contracts';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import PriceChart from '@/components/base/PriceChart';
import { Select } from '@/components/base/Controls';
import { Skeleton } from '@/components/base/Bits';
import { SectionHeader } from '@/components/base/Bits';
import Button from '@/components/base/Button';
import { type RangeKey } from '@/lib/history';
import { money } from '@/lib/format';
import { PriceActivity, RecentAlerts, RecentlyTracked, RecommendedDeals } from './components/OverviewPanels';

type OutletCtx = { openAddProduct: () => void };

export default function Overview() {
  const { user } = useAuth();
  const { products, dashboard, pending, revision, refresh, error } = useWorkspace();
  const { openAddProduct } = useOutletContext<OutletCtx>();
  const ready = !pending;
  const [range, setRange] = useState<RangeKey>('30d');

  const tracked=products;
  const [focusId,setFocusId]=useState('');
  const focus=tracked.find(item=>item.id===focusId) ?? tracked[0];
  const history=useApiResource<History>(focus?'/products/'+focus.id+'/history?range='+range:null,revision);
  const {points,stats}=history.data ?? emptyHistory;
  const metrics=dashboard?.metrics;
  const stats3=[
    {label:'Tracked products',value:metrics?.tracked ?? 0,note:(metrics?.active ?? 0)+' actively monitored',icon:'ri-inbox-archive-line'},
    {label:'Price drops',value:metrics?.priceDrops ?? 0,note:'Below their previous price',icon:'ri-arrow-down-line'},
    {label:'Triggered alerts',value:dashboard?.unread ?? 0,note:'Waiting for your review',icon:'ri-notification-3-line'},
    {label:'Potential savings',value:money(metrics?.potentialSavings),note:'Versus previous prices',icon:'ri-wallet-3-line',wide:true},
    {label:'Monitoring health',value:dashboard?.monitoringHealth!=null?dashboard.monitoringHealth+'%':'—',note:'Across monitored sources',icon:'ri-shield-check-line'},
  ];

  const greeting = new Date().getUTCHours() < 12 ? 'Good morning' : new Date().getUTCHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      <ApiStatus error={error ?? history.error} retry={refresh}/>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-400">
            {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
          </p>
          <h1 className="mt-1 font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[26px]">
            Here is how your prices moved
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground-500">
            Your price monitoring workspace
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/app/deals">
            <Button variant="secondary" size="sm" icon="ri-compass-3-line">
              Explore deals
            </Button>
          </Link>
          <Button size="sm" icon="ri-add-line" onClick={openAddProduct}>
            Add product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {!ready
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-background-200 bg-background-50 p-4">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-3 h-5 w-24" />
                <Skeleton className="mt-2 h-2 w-16" />
              </div>
            ))
          : stats3.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-background-200 bg-background-50 p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-foreground-500">{stat.label}</p>
                  <i aria-hidden="true" className={`${stat.icon} text-[14px] text-foreground-300`}></i>
                </div>
                <p
                  className={`mt-2 font-label font-semibold tracking-tight text-foreground-950 ${
                    stat.wide ? 'text-[17px]' : 'text-[22px]'
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[10.5px] text-foreground-400">{stat.note}</p>
              </div>
            ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50 p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader title="Price trend" subtitle="Historical chart for one tracked product" />
            <Select
              value={focus?.id ?? ""}
              onChange={setFocusId}
              aria-label="Select product"
              className="w-full sm:w-52"
              options={tracked.map((product) => ({ value: product.id, label: product.title.split('(')[0].slice(0, 26) }))}
            />
          </div>

          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-label text-[20px] font-semibold tracking-tight text-foreground-950">{money(focus?.price)}</p>
              <p className="mt-0.5 text-[11px] text-foreground-500">
                {focus?.marketplace ?? "No product selected"} · target {money(focus?.targetPrice)}
              </p>
            </div>
            <span className="text-[11px] text-foreground-400">{stats.changes} recorded changes in this range</span>
          </div>

          <PriceChart points={points} range={range} onRangeChange={setRange} target={focus?.targetPrice} height={228} />

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-background-200 pt-3 sm:grid-cols-4">
            {[
              { label: 'Lowest', value: stats.min },
              { label: 'Average', value: stats.avg },
              { label: 'Median', value: stats.median },
              { label: 'Highest', value: stats.max },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">{item.label}</p>
                <p className="mt-0.5 truncate font-label text-[11.5px] font-medium text-foreground-900">{money(item.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <RecentAlerts />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <PriceActivity />
        <RecommendedDeals />
      </div>

      <RecentlyTracked />

      <p className="flex items-start gap-1.5 pb-2 text-[11px] leading-relaxed text-foreground-400">
        <i aria-hidden="true" className="ri-information-line mt-0.5 text-sm"></i>
        Potential savings are measured against recorded previous prices.
      </p>
    </div>
  );
}