import ProductImage from '@/components/base/ProductImage';
import { apiPath, download } from '@/lib/api';
import { productView, type ApiProduct, type Page } from '@/lib/contracts';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import { EmptyState } from '@/components/base/Bits';
import { Select } from '@/components/base/Controls';
import { ProductGrid, ProductTable } from './components/ProductViews';
import TargetModal from './components/TargetModal';
import type { Product } from '@/lib/types';
import { money } from '@/lib/format';

const PAGE_SIZE = 8;

const statusTabs = [
  { key: 'all', label: 'All products' },
  { key: 'active', label: 'Active' },
  { key: 'triggered', label: 'Triggered' },
  { key: 'paused', label: 'Paused' },
  { key: 'unavailable', label: 'Unavailable' },
];

const sortOptions = [
  { value: 'recent', label: 'Recently checked' },
  { value: 'change', label: 'Largest drop' },
  { value: 'price', label: 'Lowest price' },
  { value: 'name', label: 'Name A–Z' },
];

export default function MyProducts() {
  const { products, setStatus, removeProduct, pushToast, perform, bulk, revision, refresh } = useWorkspace();
  const { openAddProduct } = useOutletContext<{ openAddProduct: () => void }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Product | null>(null);
  const [bulkRemove, setBulkRemove] = useState(false);

  const tracked = products.filter((product) => product.tracked);

  const counts = {
    all: tracked.length,
    active: tracked.filter((product) => product.status === 'active').length,
    triggered: tracked.filter((product) => product.status === 'triggered').length,
    paused: tracked.filter((product) => product.status === 'paused').length,
    unavailable: tracked.filter((product) => product.status === 'unavailable').length,
  };

  const content=useApiResource<Page<ApiProduct>>(apiPath('/products',{page,pageSize:PAGE_SIZE,sort,query:query.trim(),status:tab==='all'?undefined:tab}),revision,150);
  const total=content.data?.total ?? 0;
  const totalPages=content.data?.totalPages ?? 1;
  const currentPage=page;
  const visible=content.data?.items.map(productView) ?? [];

  const toggleMonitor = async (product: Product) => {
    const next = product.status === 'paused' ? 'active' : 'paused';
    if(!await setStatus(product.id,next)) return;
    pushToast(next === 'paused' ? `Monitoring paused for ${product.brand}` : `Monitoring resumed for ${product.brand}`, 'info');
  };

  const actions = {
    revision,
    selected,
    onSelect: (id: string) =>
      setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
    onSelectAll: (ids: string[]) => setSelected(ids),
    onOpen: (id: string) => navigate(`/app/products/${id}`),
    onEditTarget: (product: Product) => setTargetProduct(product),
    onToggleMonitor: toggleMonitor,
    onRemove: (product: Product) => setRemoveTarget(product),
  };

  return (
    <div className="space-y-4">
      <ApiStatus loading={content.loading && !content.data} error={content.error} retry={refresh}/>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
            My products
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground-500">
            {tracked.length} products monitored · {counts.triggered} conditions met
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="ri-download-2-line" onClick={() => void perform(()=>download('/products/export','deal-alert-products.csv'))}>
            Export
          </Button>
          <Button size="sm" icon="ri-add-line" onClick={openAddProduct}>
            Add product
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-background-200 bg-background-50">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto">
            {statusTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
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
                  {counts[item.key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-foreground-400"></i>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search products"
                aria-label="Search products"
                className="h-8 w-full rounded-lg border border-background-200 bg-background-50 pl-8 pr-2.5 text-[12px] text-foreground-900 outline-none placeholder:text-foreground-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 sm:w-48"
              />
            </div>
            <Select value={sort} onChange={setSort} options={sortOptions} aria-label="Sort products" className="w-36" />
            <div className="inline-flex items-center gap-1 rounded-lg border border-background-200 bg-background-50 p-1">
              {(['table', 'grid'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-label={`${mode} view`}
                  className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                    view === mode ? 'bg-foreground-950 text-background-50' : 'text-foreground-500 hover:text-foreground-900'
                  }`}
                >
                  <i aria-hidden="true" className={`${mode === 'table' ? 'ri-list-check' : 'ri-grid-fill'} text-[13px]`}></i>
                </button>
              ))}
            </div>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-background-200 bg-primary-500/[0.06] px-3 py-2 anim-fade">
            <p className="text-[11.5px] font-medium text-foreground-900">{selected.length} selected</p>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                icon="ri-pause-line"
                onClick={async () => {
                  if(!await bulk(selected,"pause"))return;
                  pushToast(`Paused monitoring for ${selected.length} products`, 'info');
                  setSelected([]);
                }}
              >
                Pause
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon="ri-play-line"
                onClick={async () => {
                  if(!await bulk(selected,"resume"))return;
                  pushToast(`Resumed monitoring for ${selected.length} products`);
                  setSelected([]);
                }}
              >
                Resume
              </Button>
              <Button variant="danger" size="sm" icon="ri-delete-bin-line" onClick={() => setBulkRemove(true)}>
                Remove
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {total === 0 ? (
          <EmptyState
            icon="ri-inbox-archive-line"
            title={tracked.length === 0 ? 'No products tracked yet' : 'No products match this view'}
            body={
              tracked.length === 0
                ? 'Paste a product link from a supported marketplace and we will start recording its price history.'
                : 'Try a different status tab or clear your search to see the rest of your products.'
            }
            action={
              tracked.length === 0 ? (
                <Button size="sm" icon="ri-add-line" onClick={openAddProduct}>
                  Track your first product
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTab('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="border-t border-background-200">
            {view === 'table' ? (
              <ProductTable products={visible} actions={actions} />
            ) : (
              <ProductGrid products={visible} actions={actions} />
            )}
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-background-200 px-3 py-2.5 sm:flex-row">
            <p className="text-[11px] text-foreground-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of{' '}
              {total} products
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
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index + 1)}
                  className={`h-7 min-w-7 rounded-md border px-1.5 font-label text-[11px] transition-colors cursor-pointer ${
                    currentPage === index + 1
                      ? 'border-foreground-950 bg-foreground-950 text-background-50'
                      : 'border-background-200 text-foreground-600 hover:bg-background-100'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
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

      <TargetModal product={targetProduct} onClose={() => setTargetProduct(null)} />

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove product"
        description="This deletes the product and its recorded price history from your workspace."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (removeTarget) {
                  if(!await removeProduct(removeTarget.id))return;
                  pushToast(`${removeTarget.brand} removed from your products`, 'info');
                  setTargetProduct(null);
                }
                setRemoveTarget(null);
              }}
            >
              Remove product
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg border border-background-200 bg-background-100 p-3">
          <ProductImage
            src={removeTarget?.image || undefined}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-md border border-background-200 object-cover object-top"
          />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-foreground-950">{removeTarget?.title}</p>
            <p className="mt-0.5 text-[11px] text-foreground-500">
              {removeTarget?.marketplace} · target {removeTarget ? money(removeTarget.targetPrice) : ''}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={bulkRemove}
        onClose={() => setBulkRemove(false)}
        title={`Remove ${selected.length} products?`}
        description="Their price history will be deleted from your workspace. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if(!await bulk(selected,"remove"))return;
                pushToast(`${selected.length} products removed`, 'info');
                setSelected([]);
                setBulkRemove(false);
              }}
            >
              Remove selected
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-foreground-600">
          You will stop receiving alerts for these listings. Equivalent offers on other marketplaces are not affected.
        </p>
      </Modal>
    </div>
  );
}