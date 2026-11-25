import { apiPath } from '@/lib/api';
import { productView, type CatalogPage, type SourceInfo } from '@/lib/contracts';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import FiltersPanel, { defaultFilters, type DealFilters } from './components/FiltersPanel';
import { DealCard, DealRow } from './components/DealCard';
import Button from '@/components/base/Button';
import { EmptyState, Skeleton } from '@/components/base/Bits';
import { Select } from '@/components/base/Controls';
import { money } from '@/lib/format';

const PAGE_SIZE = 6;

const sortOptions = [
  { value: 'score', label: 'Best opportunities' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'price-asc', label: 'Lowest price' },
  { value: 'change', label: 'Largest decrease' },
  { value: 'recent', label: 'Recently updated' },
];

export default function ExploreDeals() {
  const { revision, refresh } = useWorkspace();
  const { openAddProduct } = useOutletContext<{ openAddProduct: () => void }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DealFilters>(defaultFilters);
  const [sort, setSort] = useState('score');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [mobileFilters, setMobileFilters] = useState(false);

  const sources=useApiResource<SourceInfo[]>('/marketplaces', revision);
  const resource=useApiResource<CatalogPage>(apiPath('/deals',{
    page,pageSize:PAGE_SIZE,sort,query:filters.query.trim(),marketplaces:filters.marketplaces.join(','),
    brand:filters.brand,category:filters.category,condition:filters.condition,min:filters.min,max:filters.max,minDiscount:filters.minDiscount,
    inStock:filters.inStock,histLow:filters.histLow,dropOnly:filters.dropOnly,
  }),revision,150);
  const categories=resource.data?.facets.categories ?? [];
  const brands=resource.data?.facets.brands ?? [];
  const marketplaceNames=sources.data?.map(source=>source.name) ?? [];

  const activeCount =
    filters.marketplaces.length +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.brand !== 'all' ? 1 : 0) +
    (filters.condition !== 'all' ? 1 : 0) +
    (filters.min ? 1 : 0) +
    (filters.max ? 1 : 0) +
    (filters.minDiscount ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.histLow ? 1 : 0) +
    (filters.dropOnly ? 1 : 0);

  const patch = (next: Partial<DealFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const total=resource.data?.total ?? 0;
  const totalPages=resource.data?.totalPages ?? 1;
  const currentPage=page;
  const visible=resource.data?.items.map(productView) ?? [];
  const averageSaving=resource.data?.averageSaving ?? 0;
  const ready = !resource.loading || Boolean(resource.data);
  const hasFilters = activeCount > 0 || Boolean(filters.query.trim());
  const hasLiveSource = sources.data?.some((source) => source.enabled);

  const panel = (
    <FiltersPanel
      filters={filters}
      onChange={patch}
      marketplaces={marketplaceNames}
      categories={categories}
      brands={brands}
      activeCount={activeCount}
      onReset={() => {
        setFilters(defaultFilters);
        setPage(1);
      }}
    />
  );

  return (
    <div className="space-y-4">
      <ApiStatus error={resource.error ?? sources.error} retry={refresh}/>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
            Explore deals
          </h1>
          <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-foreground-500">
            Offers with enough price evidence to judge honestly. {total} products match your filters · average
            drop {money(averageSaving)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="ri-filter-3-line" className="lg:hidden" onClick={() => setMobileFilters((v) => !v)}>
            Filters
          </Button>
          <Select value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={sortOptions} aria-label="Sort deals" className="w-40" />
          <div className="inline-flex items-center gap-1 rounded-lg border border-background-200 bg-background-50 p-1">
            {(['grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-label={`${mode} view`}
                className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                  view === mode ? 'bg-foreground-950 text-background-50' : 'text-foreground-500 hover:text-foreground-900'
                }`}
              >
                <i aria-hidden="true" className={`${mode === 'grid' ? 'ri-grid-fill' : 'ri-list-check'} text-[13px]`}></i>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-foreground-400"></i>
          <input
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder="Search by product, brand, model or seller"
            aria-label="Search deals"
            className="h-9 w-full rounded-lg border border-background-200 bg-background-50 pl-9 pr-3 text-[12.5px] text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon="ri-add-line" onClick={openAddProduct}>
            Track a product
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <aside className={`${mobileFilters ? 'block' : 'hidden'} w-full shrink-0 rounded-xl border border-background-200 bg-background-50 p-3.5 lg:block lg:w-[220px] lg:self-start lg:sticky lg:top-[72px]`}>
          {panel}
        </aside>

        <div className="min-w-0 flex-1">
          {!ready ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="rounded-xl border border-background-200 bg-background-50">
              <EmptyState
                icon="ri-search-eye-line"
                title={hasFilters ? "No deals match these filters" : "No marketplace offers available"}
                body={hasFilters ? "Adjust the filters or search for another product." : hasLiveSource ? "Add a product link from an enabled marketplace to start collecting offers." : "Live marketplace sources are currently disabled."}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={() => { setFilters(defaultFilters); setPage(1); }}>
                      Reset filters
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={openAddProduct}>Track a product</Button>
                  )
                }
              />
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((product) => (
                <DealCard
                  key={product.id}
                  product={product}
                  min={product.historicalLow ?? Number.NaN}
                  onOpen={() => navigate(`/app/products/${product.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
              {visible.map((product) => (
                <DealRow
                  key={product.id}
                  product={product}
                  min={product.historicalLow ?? Number.NaN}
                  onOpen={() => navigate(`/app/products/${product.id}`)}
                />
              ))}
            </div>
          )}

          {total > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
              <p className="text-[11.5px] text-foreground-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of{' '}
                {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-background-200 bg-background-50 text-foreground-600 disabled:opacity-40 hover:bg-background-100 cursor-pointer"
                  aria-label="Previous page"
                >
                  <i aria-hidden="true" className="ri-arrow-left-s-line text-sm"></i>
                </button>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index + 1)}
                    className={`h-7 min-w-7 rounded-md border px-1.5 font-label text-[11px] transition-colors cursor-pointer ${
                      currentPage === index + 1
                        ? 'border-foreground-950 bg-foreground-950 text-background-50'
                        : 'border-background-200 bg-background-50 text-foreground-600 hover:bg-background-100'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-background-200 bg-background-50 text-foreground-600 disabled:opacity-40 hover:bg-background-100 cursor-pointer"
                  aria-label="Next page"
                >
                  <i aria-hidden="true" className="ri-arrow-right-s-line text-sm"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}