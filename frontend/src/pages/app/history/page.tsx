import ProductImage from '@/components/base/ProductImage';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { apiPath } from '@/lib/api';
import { emptyHistory, type History, type Page, type WorkspaceEvent, type SourceInfo } from '@/lib/contracts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import PriceChart from '@/components/base/PriceChart';
import { Select } from '@/components/base/Controls';
import { Delta, EmptyState } from '@/components/base/Bits';
import type { RangeKey } from '@/lib/history';
import { money, shortDate } from '@/lib/format';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { products, revision, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [productId, setProductId] = useState('');
  const [range, setRange] = useState<RangeKey>('90d');
  const [marketplace, setMarketplace] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const product=products.find(item=>item.id===productId) ?? products[0];
  const rangeHistory=useApiResource<History>(product?'/products/'+product.id+'/history?range='+range:null,revision);
  const eventFeed=useApiResource<Page<WorkspaceEvent>>(apiPath('/history',{range,page,pageSize:PAGE_SIZE,query:query.trim(),marketplaces:marketplace==='all'?undefined:marketplace}),revision,150);
  const sourceList=useApiResource<SourceInfo[]>('/marketplaces', revision);
  const marketplaceNames=sourceList.data?.map(source=>source.name) ?? [];
  const {points,stats,events}=rangeHistory.data ?? emptyHistory;
  const total=eventFeed.data?.total ?? 0;
  const totalPages=eventFeed.data?.totalPages ?? 1;
  const currentPage=page;
  const visible=(eventFeed.data?.items ?? []).map(event=>({...event, product:{
    id:event.productId,title:event.title,image:products.find(product=>product.id===event.productId)?.image,
    marketplace:sourceList.data?.find(source=>source.source===event.source)?.name ?? event.source,
  }}));

  return (
    <div className="space-y-4">
      <ApiStatus loading={rangeHistory.loading || eventFeed.loading} error={rangeHistory.error ?? eventFeed.error ?? sourceList.error} retry={refresh}/>
      <div>
        <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
          Price history
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-foreground-500">
          Explore recorded price activity across your products. Every change keeps the previous price, the new price and the
          timestamp.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Recorded series</p>
              <h2 className="mt-1 truncate font-heading text-[14px] font-semibold text-foreground-950">{product?.title ?? "No tracked product"}</h2>
              <p className="mt-0.5 text-[11px] text-foreground-500">
                {product?.marketplace ?? "—"} · {stats.changes} changes in the selected period
              </p>
            </div>
            <Select
              value={product?.id ?? ""}
              onChange={(value) => {
                setProductId(value);
                setPage(1);
              }}
              aria-label="Select product"
              className="w-full sm:w-52"
              options={products.map((item) => ({ value: item.id, label: item.title.slice(0, 26) }))}
            />
          </div>

          <div className="mt-3">
            <PriceChart points={points} range={range} onRangeChange={(value) => { setRange(value); setPage(1); }} target={product?.targetPrice} height={250} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-background-200 pt-3 sm:grid-cols-4">
            {[
              { label: 'Lowest', value: stats.min, tone: 'text-primary-600 dark:text-primary-400' },
              { label: 'Highest', value: stats.max },
              { label: 'Average', value: stats.avg },
              { label: 'Median', value: stats.median },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] uppercase tracking-[0.08em] text-foreground-400">{item.label}</p>
                <p className={`mt-0.5 truncate font-label text-[11.5px] font-medium ${item.tone ?? 'text-foreground-900'}`}>
                  {money(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Activity summary</p>
          <div className="mt-3 space-y-2.5">
            {[
              { label: 'Recorded changes', value: `${stats.changes}`, note: 'In the selected period' },
              {
                label: 'Largest decrease',
                value: money(Math.max(...events.map((event) => Math.abs(Math.min(event.change, 0))), 0)),
                note: 'Single recorded event',
              },
              {
                label: 'Current vs average',
                value: product && stats.avg && Number.isFinite(product.price) ? `${(((product.price - stats.avg) / stats.avg) * 100).toFixed(1)}%` : '—',
                note: 'Negative means cheaper than usual',
              },
              { label: 'Events in table', value: `${total}`, note: 'Matching your filters' },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3 border-b border-background-200 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-[11.5px] font-medium text-foreground-800">{item.label}</p>
                  <p className="text-[10px] text-foreground-400">{item.note}</p>
                </div>
                <p className="shrink-0 font-label text-[11.5px] text-foreground-950">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-background-200 bg-background-100 px-2 py-1 text-[10.5px] text-foreground-600">
              {product?.marketplace ?? "—"}
            </span>
            <span className="rounded-md border border-background-200 bg-background-100 px-2 py-1 text-[10.5px] text-foreground-600">
              {product?.condition ?? '—'}
            </span>
            <span className="rounded-md border border-background-200 bg-background-100 px-2 py-1 text-[10.5px] text-foreground-600">
              target {money(product?.targetPrice)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-[14px] font-semibold text-foreground-950">Price events</h2>
            <p className="text-[11px] text-foreground-500">{total} recorded changes match your filters</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={marketplace}
              onChange={(value) => {
                setMarketplace(value);
                setPage(1);
              }}
              aria-label="Filter by marketplace"
              className="w-36"
              options={[{ value: 'all', label: 'All marketplaces' }, ...marketplaceNames.map((name) => ({ value: name, label: name }))]}
            />
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-foreground-400"></i>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search events"
                aria-label="Search price events"
                className="h-8 w-full rounded-lg border border-background-200 bg-background-50 pl-8 pr-2.5 text-[12px] text-foreground-900 outline-none placeholder:text-foreground-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 sm:w-44"
              />
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="ri-line-chart-line"
            title="No price events in this period"
            body="Widen the date range, choose another marketplace, or clear the search to see more recorded changes."
          />
        ) : (
          <div className="overflow-x-auto border-t border-background-200">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-background-200 bg-background-100/60">
                  {['Date', 'Product', 'Marketplace', 'Previous', 'New price', 'Change', '%'].map((head) => (
                    <th key={head} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => navigate(`/app/products/${event.product.id}`)}
                    className="cursor-pointer border-b border-background-200 last:border-0 hover:bg-background-100/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[11.5px] text-foreground-600">{shortDate(event.date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProductImage
                          src={event.product?.image || undefined}
                          alt=""
                          width={26}
                          height={26}
                          className="h-7 w-7 shrink-0 rounded border border-background-200 object-cover object-top"
                        />
                        <span className="max-w-[210px] truncate text-[11.5px] text-foreground-800">{event.product?.title ?? "No tracked product"}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-foreground-500">{event.product?.marketplace ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-label text-[11px] text-foreground-500">{money(event.from)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-label text-[11px] font-medium text-foreground-950">
                      {money(event.to)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-label text-[11px] ${
                        event.change < 0 ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600'
                      }`}
                    >
                      {event.change < 0 ? '−' : '+'}
                      {money(Math.abs(event.change)).replace(' UZS', '')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Delta value={event.pct} className="text-[11px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-background-200 px-3 py-2.5 sm:flex-row">
            <p className="text-[11px] text-foreground-500">
              Page {currentPage} of {totalPages} · {total} events
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-background-200 text-foreground-600 disabled:opacity-40 hover:bg-background-100 cursor-pointer"
              >
                <i aria-hidden="true" className="ri-arrow-left-s-line text-sm"></i>
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-background-200 text-foreground-600 disabled:opacity-40 hover:bg-background-100 cursor-pointer"
              >
                <i aria-hidden="true" className="ri-arrow-right-s-line text-sm"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}