import ProductImage from '@/components/base/ProductImage';
import { useState } from 'react';
import Sparkline from '@/components/base/Sparkline';
import { useApiResource } from '@/hooks/useApiResource';
import type { History } from '@/lib/contracts';
import type { Product } from '@/lib/types';
import { money, relTime } from '@/lib/format';
import { Delta, Pill, StatusPill } from '@/components/base/Bits';

function ProductTrend({ product, revision }: { product: Product; revision: number }) {
  const { data } = useApiResource<History>('/products/' + product.id + '/history?range=30d', revision);
  const points = data?.points ?? [];
  if (points.length < 2) return <span className="text-foreground-400" title="Price history needs two recorded prices">—</span>;
  const difference = points.at(-1)!.price - points[0].price;
  const trend = difference < 0 ? 'down' : difference > 0 ? 'up' : 'flat';
  return <Sparkline data={points.map(({ price }) => ({ v: price }))} trend={trend} />;
}

type Actions = {
  revision: number;
  selected: string[];
  onSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onEditTarget: (product: Product) => void;
  onToggleMonitor: (product: Product) => void;
  onRemove: (product: Product) => void;
};

function RowMenu({ product, actions, onClose }: { product: Product; actions: Actions; onClose: () => void }) {
  const paused = product.status === 'paused';
  return (
    <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-44 overflow-hidden rounded-lg border border-background-200 bg-background-50 p-1 shadow-pop anim-pop">
      <button
        type="button"
        onClick={() => {
          actions.onOpen(product.id);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] text-foreground-700 hover:bg-background-100 cursor-pointer"
      >
        <i aria-hidden="true" className="ri-external-link-line text-[13px] text-foreground-400"></i>
        Open product
      </button>
      <button
        type="button"
        onClick={() => {
          actions.onEditTarget(product);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] text-foreground-700 hover:bg-background-100 cursor-pointer"
      >
        <i aria-hidden="true" className="ri-focus-3-line text-[13px] text-foreground-400"></i>
        Edit target price
      </button>
      <button
        type="button"
        onClick={() => {
          actions.onToggleMonitor(product);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] text-foreground-700 hover:bg-background-100 cursor-pointer"
      >
        <i aria-hidden="true" className={`${paused ? 'ri-play-circle-line' : 'ri-pause-circle-line'} text-[13px] text-foreground-400`}></i>
        {paused ? 'Resume monitoring' : 'Pause monitoring'}
      </button>
      <div className="my-1 h-px bg-background-200"></div>
      <button
        type="button"
        onClick={() => {
          actions.onRemove(product);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] text-danger-600 hover:bg-danger-500/10 cursor-pointer"
      >
        <i aria-hidden="true" className="ri-delete-bin-line text-[13px]"></i>
        Remove product
      </button>
    </div>
  );
}

export function ProductTable({ products, actions }: { products: Product[]; actions: Actions }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const allSelected = products.length > 0 && products.every((product) => actions.selected.includes(product.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-b border-background-200 bg-background-100/60">
            <th className="w-9 px-3 py-2">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={() => actions.onSelectAll(allSelected ? [] : products.map((product) => product.id))}
                className="h-3.5 w-3.5 rounded border-background-300 accent-primary-600 cursor-pointer"
              />
            </th>
            {['Product', 'Marketplace', 'Current', 'Target', 'Trend', 'Change', 'Status', ''].map((head) => (
              <th
                key={head}
                className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400 ${
                  head === '' ? 'w-10' : ''
                }`}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const checked = actions.selected.includes(product.id);
            const paused = product.status === 'paused';
            return (
              <tr
                key={product.id}
                className={`border-b border-background-200 last:border-0 transition-colors ${
                  checked ? 'bg-primary-500/[0.05]' : 'hover:bg-background-100/60'
                }`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.title}`}
                    checked={checked}
                    onChange={() => actions.onSelect(product.id)}
                    className="h-3.5 w-3.5 rounded border-background-300 accent-primary-600 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => actions.onOpen(product.id)}
                    className="flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <ProductImage
                      src={product.image || undefined}
                      alt=""
                      width={34}
                      height={34}
                      className="h-[34px] w-[34px] shrink-0 rounded-md border border-background-200 object-cover object-top"
                    />
                    <span className="min-w-0">
                      <span className="block max-w-[240px] truncate text-[12px] font-medium text-foreground-900">
                        {product.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-foreground-400">
                        {product.brand} · {product.model} · {product.condition}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-[11.5px] text-foreground-700">{product.marketplace}</p>
                  <p className="mt-0.5 max-w-[130px] truncate text-[10px] text-foreground-400">{product.seller}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <p className="font-label text-[11.5px] font-medium text-foreground-950">{money(product.price)}</p>
                  <p className="font-label text-[10px] text-foreground-400 line-through">{money(product.previousPrice)}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-label text-[11px] text-foreground-500">
                  {money(product.targetPrice)}
                </td>
                <td className="w-[86px] px-3 py-2.5">
                  <ProductTrend product={product} revision={actions.revision} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Delta value={product.changePct} className="text-[11px]" />
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill status={product.status} compact />
                </td>
                <td className="relative px-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => setMenuId(menuId === product.id ? null : product.id)}
                    aria-label={`Actions for ${product.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-500 hover:bg-background-200 hover:text-foreground-900 cursor-pointer"
                  >
                    <i aria-hidden="true" className="ri-more-2-line text-base"></i>
                  </button>
                  {menuId === product.id && <RowMenu product={product} actions={actions} onClose={() => setMenuId(null)} />}
                  <span className="sr-only">{paused ? 'Paused' : 'Monitoring'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProductGrid({ products, actions }: { products: Product[]; actions: Actions }) {
  return (
    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const checked = actions.selected.includes(product.id);
        return (
          <div
            key={product.id}
            className={`overflow-hidden rounded-xl border bg-background-50 transition-colors ${
              checked ? 'border-primary-500/40' : 'border-background-200'
            }`}
          >
            <div className="relative border-b border-background-200 bg-background-100">
              <ProductImage src={product.image || undefined} alt={product.title} className="h-36 w-full object-cover object-top" />
              <div className="absolute left-2 top-2">
                <input
                  type="checkbox"
                  aria-label={`Select ${product.title}`}
                  checked={checked}
                  onChange={() => actions.onSelect(product.id)}
                  className="h-4 w-4 rounded border-background-300 accent-primary-600 cursor-pointer"
                />
              </div>
              <div className="absolute right-2 top-2">
                <StatusPill status={product.status} compact />
              </div>
            </div>
            <div className="p-3">
              <button type="button" onClick={() => actions.onOpen(product.id)} className="text-left cursor-pointer">
                <p className="truncate text-[12px] font-medium text-foreground-900">{product.title}</p>
              </button>
              <p className="mt-0.5 truncate text-[10.5px] text-foreground-400">
                {product.marketplace} · {product.seller}
              </p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[13px] font-semibold text-foreground-950">{money(product.price)}</p>
                  <p className="mt-0.5 text-[10px] text-foreground-400">Target {money(product.targetPrice)}</p>
                </div>
                <div className="w-20"><ProductTrend product={product} revision={actions.revision} /></div>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-background-200 pt-2">
                <Pill>{relTime(product.lastChecked)}</Pill>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => actions.onEditTarget(product)}
                    aria-label="Edit target"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 hover:text-foreground-900 cursor-pointer"
                  >
                    <i aria-hidden="true" className="ri-focus-3-line text-sm"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.onToggleMonitor(product)}
                    aria-label="Pause or resume"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 hover:text-foreground-900 cursor-pointer"
                  >
                    <i aria-hidden="true" className={`${product.status === 'paused' ? 'ri-play-line' : 'ri-pause-line'} text-sm`}></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.onRemove(product)}
                    aria-label="Remove product"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-500 hover:bg-danger-500/10 hover:text-danger-600 cursor-pointer"
                  >
                    <i aria-hidden="true" className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}