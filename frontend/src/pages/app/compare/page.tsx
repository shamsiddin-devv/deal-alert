import ProductImage from '@/components/base/ProductImage';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { apiPath } from '@/lib/api';
import { productView, type ApiProduct, type Offers, type Page } from '@/lib/contracts';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { money, pct } from '@/lib/format';
import Button from '@/components/base/Button';
import { EmptyState, Pill } from '@/components/base/Bits';

export default function ComparePage() {
  const {products,revision,refresh}=useWorkspace();
  const [query,setQuery]=useState('');
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('product') ?? '';
  const setSelectedId = (id: string) => setParams({ product: id }, { replace: true });
  const search=useApiResource<Page<ApiProduct>>(query.trim()?apiPath('/search',{query:query.trim(),pageSize:8}):null,revision,160);
  const candidates=query.trim()?(search.data?.items.map(productView) ?? []):products.slice(0,8);
  const selected=useApiResource<ApiProduct>(selectedId?'/products/'+selectedId:null,revision);
  const product=selectedId?(selected.data?productView(selected.data):products.find(item=>item.id===selectedId)):products[0];
  const comparisons=useApiResource<Offers>(product?'/products/'+product.id+'/offers':null,revision);
  const offers=comparisons.data?.offers ?? [];
  const cheapest=comparisons.data?.lowestOverall;
  const bestNew=comparisons.data?.bestNew;
  const spread=comparisons.data?.priceSpread;

  return (
    <div className="space-y-4">
      <ApiStatus loading={search.loading || selected.loading || comparisons.loading} error={search.error ?? selected.error ?? comparisons.error} retry={refresh}/>
      <div>
        <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
          Price comparison
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-foreground-500">
          Matched by model and configuration. Final cost includes delivery when available. New and used listings are shown separately.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50 p-3">
          <div className="relative">
            <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-foreground-400"></i>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or models"
              aria-label="Search products"
              className="h-8 w-full rounded-lg border border-background-200 bg-background-50 pl-8 pr-2.5 text-[12px] text-foreground-900 outline-none placeholder:text-foreground-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-400">
            {query ? 'Search results' : 'Tracked products'}
          </p>
          <div className="mt-1 space-y-0.5">
            {candidates.length === 0 && <p className="px-1 py-3 text-[11.5px] text-foreground-400">No products matched.</p>}
            {candidates.map((item) => {
              const active = item.id === product?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    active ? 'bg-background-950/[0.06] dark:bg-background-50/10' : 'hover:bg-background-100'
                  }`}
                >
                  <ProductImage
                    src={item.image || undefined}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-md border border-background-200 object-cover object-top"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[11.5px] ${active ? 'font-medium text-foreground-950' : 'text-foreground-700'}`}>
                      {item.title}
                    </span>
                    <span className="block text-[10px] text-foreground-400">
                      {item.brand} · {item.condition === 'New' ? 'New' : 'Used'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {product && <div className="space-y-3">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProductImage
                  src={product.image || undefined}
                  alt={product.title}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-lg border border-background-200 object-cover object-top"
                />
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-[15px] font-semibold text-foreground-950">{product.title}</h2>
                  <p className="mt-0.5 text-[11.5px] text-foreground-500">
                    {product.brand} · {product.model} · showing {offers.length} matched offers
                  </p>
                </div>
              </div>
              <Link to={`/app/products/${product.id}`}>
                <Button variant="secondary" size="sm" icon="ri-external-link-line">
                  Open product
                </Button>
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-background-200 pt-3 sm:grid-cols-4">
              {[
                { label: 'Best new offer', value: money(bestNew?.finalCost), tone: 'text-primary-600 dark:text-primary-400' },
                { label: 'Lowest overall', value: money(cheapest?.finalCost) },
                { label: 'Price spread', value: money(spread) },
                { label: 'Offers matched', value: `${offers.length} stores` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-foreground-400">{item.label}</p>
                  <p className={`mt-0.5 truncate font-label text-[11.5px] font-medium ${item.tone ?? 'text-foreground-900'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-background-200 bg-background-100/60">
                    {['Store', 'Seller', 'Condition', 'Price', 'Delivery', 'Final cost', 'Warranty'].map((head) => (
                      <th key={head} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr
                      key={offer.id}
                      className={`border-b border-background-200 last:border-0 ${
                        offer.best ? 'bg-primary-500/[0.06]' : 'hover:bg-background-100/60'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-medium text-foreground-900">{offer.marketplace}</span>
                          {offer.best && (
                            <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background-50">
                              Best
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-foreground-400">{offer.stock}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="max-w-[150px] truncate text-[11.5px] text-foreground-600">{offer.seller ?? 'Seller unavailable'}</p>
                        {offer.sellerRating !== null && <p className="text-[10px] text-foreground-400">★ {offer.sellerRating}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Pill className={offer.condition === 'New' ? '' : 'border-accent-500/25 text-accent-800 dark:text-accent-400'}>
                          {offer.condition}
                        </Pill>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-label text-[11px] text-foreground-800">
                        {money(offer.price)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[11.5px] text-foreground-500">
                        {offer.delivery === 0 ? 'Free' : money(offer.delivery)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-label text-[11.5px] font-semibold text-foreground-950">
                        {money(offer.finalCost)}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-foreground-500">{offer.warranty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-background-200 md:hidden">
              {offers.map((offer) => (
                <div key={offer.id} className={`p-3.5 ${offer.best ? 'bg-primary-500/[0.06]' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-foreground-950">{offer.marketplace}</p>
                    {offer.best && (
                      <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background-50">
                        Best new
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-foreground-500">
                    {offer.seller ?? 'Seller unavailable'}{offer.sellerRating !== null ? ' · ★ ' + offer.sellerRating : ''}
                  </p>
                  <div className="mt-1.5 flex items-end justify-between">
                    <div>
                      <p className="font-label text-[13px] font-semibold text-foreground-950">{money(offer.price)}</p>
                      <p className="text-[10.5px] text-foreground-400">
                        {offer.condition} · delivery {offer.delivery === 0 ? 'free' : money(offer.delivery)}
                      </p>
                    </div>
                    <p className="font-label text-[11px] text-foreground-700">{money(offer.finalCost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cheapest && cheapest.condition !== 'New' && (
            <p className="flex items-start gap-1.5 rounded-lg border border-accent-500/25 bg-accent-500/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-foreground-700">
              <i aria-hidden="true" className="ri-error-warning-line mt-0.5 text-sm text-accent-700 dark:text-accent-400"></i>
              The cheapest listing ({cheapest.marketplace}, {money(cheapest?.finalCost)}) has a different condition. It is
              shown for context but excluded from the best new offer.
            </p>
          )}

          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Configuration check</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {product.specs.slice(0, 4).map((spec) => (
                <div key={spec.label} className="flex items-start justify-between gap-3 rounded-lg border border-background-200 bg-background-100/60 px-2.5 py-1.5">
                  <span className="text-[10.5px] text-foreground-500">{spec.label}</span>
                  <span className="text-right text-[10.5px] font-medium text-foreground-800">{spec.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-foreground-400">
              <i aria-hidden="true" className="ri-information-line mt-0.5 text-xs"></i>
              All offers above match this configuration. A different storage size or colour variant would be listed
              separately, never merged. Current discount on this product: {pct(-Math.abs(product.changePct))}.
            </p>
          </div>
        </div>}
      </div>

      {!product && !selected.loading && (
        <div className="rounded-xl border border-background-200 bg-background-50">
          <EmptyState
            icon="ri-arrow-left-right-line"
            title="Nothing to compare yet"
            body="Track a product first, then return here to see how its price differs across the five marketplaces."
            action={
              <Link to="/app/deals">
                <Button size="sm">Explore deals</Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}