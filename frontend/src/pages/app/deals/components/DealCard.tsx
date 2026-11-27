import ProductImage from '@/components/base/ProductImage';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/lib/types';
import { money, pct, shortDate } from '@/lib/format';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Pill, StatusPill } from '@/components/base/Bits';

function useWatch() {
  const { products, setTracked, pushToast } = useWorkspace();
  const isTracked = (id: string) => products.some((product) => product.id === id && product.tracked);

  const toggle = async (product: Product) => {
    const tracked = isTracked(product.id);
    if (!await setTracked(product.id, !tracked)) return;
    const title = product.title.split(' ').slice(0, 3).join(' ');
    pushToast(tracked ? title + ' removed from your products' : title + ' added to your watchlist', tracked ? 'info' : 'success');
  };

  return { isTracked, toggle };
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? 'border-primary-500/25 bg-primary-500/10 text-primary-700 dark:text-primary-400'
      : score >= 60
        ? 'border-accent-500/30 bg-accent-500/12 text-accent-800 dark:text-accent-400'
        : 'border-background-300 bg-background-100 text-foreground-500';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-label text-[10.5px] font-semibold ${tone}`}>
      <i aria-hidden="true" className="ri-sparkling-2-line text-[10px]"></i>
      {score}
    </span>
  );
}

export function DealCard({ product, min, onOpen }: { product: Product; min: number; onOpen: () => void }) {
  const navigate = useNavigate();
  const { isTracked, toggle } = useWatch();
  const tracked = isTracked(product.id);
  const cheapest = product.price <= min * 1.01;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-background-200 bg-background-50 transition-all duration-200 hover:border-background-300 hover:shadow-lift">
      <div className="relative w-full overflow-hidden border-b border-background-200 bg-background-100">
        <button type="button" onClick={onOpen} className="block w-full cursor-pointer" aria-label={`Open ${product.title}`}>
          <div className="aspect-[4/3] w-full">
            <ProductImage
              src={product.image || undefined}
              alt={product.title}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        </button>
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <ScoreBadge score={product.score} />
          {cheapest && (
            <span className="rounded-md border border-primary-500/25 bg-background-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 backdrop-blur dark:text-primary-400">
              At low
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggle(product)}
          aria-label={tracked ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border shadow-card transition-colors cursor-pointer ${
            tracked
              ? 'border-primary-500/30 bg-primary-600 text-background-50'
              : 'border-background-200 bg-background-50/90 text-foreground-600 hover:text-foreground-950 backdrop-blur'
          }`}
        >
          <i aria-hidden="true" className={`${tracked ? 'ri-check-line' : 'ri-add-line'} text-sm`}></i>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-foreground-400">
          {product.brand} · {product.category}
        </p>
        <button type="button" onClick={onOpen} className="mt-1 cursor-pointer text-left">
          <h3 className="line-clamp-2 min-h-[34px] text-[12.5px] font-medium leading-snug text-foreground-950">
            {product.title}
          </h3>
        </button>

        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="font-label text-[14px] font-semibold tracking-tight text-foreground-950">{money(product.price)}</span>
          <span className="font-label text-[10.5px] text-foreground-400 line-through">{money(product.previousPrice)}</span>
          <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 dark:text-primary-400">
            {pct(-Math.abs(product.changePct))}
          </span>
        </div>

        <p className="mt-1.5 text-[10.5px] text-foreground-500">
          {product.marketplace} · {product.seller}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-background-200 pt-2.5">
          <Pill>{product.condition === 'New' ? 'New' : product.condition.replace('Used — ', 'Used, ')}</Pill>
          <Pill>{product.stock}</Pill>
          {product.score >= 80 && <Pill className="border-primary-500/20 text-primary-700 dark:text-primary-400">{product.verdict}</Pill>}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-foreground-400">Checked {shortDate(product.lastChecked)}</span>
          <button
            type="button"
            onClick={() => navigate(`/app/products/${product.id}`)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground-700 hover:text-primary-700 dark:hover:text-primary-400 cursor-pointer"
          >
            Details
            <i aria-hidden="true" className="ri-arrow-right-line text-[11px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export function DealRow({ product, min, onOpen }: { product: Product; min: number; onOpen: () => void }) {
  const { isTracked, toggle } = useWatch();
  const tracked = isTracked(product.id);
  const cheapest = product.price <= min * 1.01;

  return (
    <div className="flex flex-col gap-3 border-b border-background-200 px-4 py-3 transition-colors last:border-0 hover:bg-background-100/60 md:flex-row md:items-center">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-background-200 bg-background-100">
          <ProductImage src={product.image || undefined} alt={product.title} className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <ScoreBadge score={product.score} />
            <p className="truncate text-[12.5px] font-medium text-foreground-950">{product.title}</p>
          </div>
          <p className="mt-0.5 truncate text-[10.5px] text-foreground-500">
            {product.brand} · {product.category} · {product.marketplace} · {product.seller}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill>{product.condition}</Pill>
            {cheapest && <Pill className="border-primary-500/20 text-primary-700 dark:text-primary-400">Historical low</Pill>}
            <StatusPill status={product.status} compact />
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="text-right">
          <p className="font-label text-[13px] font-semibold text-foreground-950">{money(product.price)}</p>
          <p className="font-label text-[10.5px] text-foreground-400 line-through">{money(product.previousPrice)}</p>
        </div>
        <span className="w-14 shrink-0 rounded bg-primary-500/10 px-1.5 py-0.5 text-center text-[10.5px] font-semibold text-primary-700 dark:text-primary-400">
          {pct(-Math.abs(product.changePct))}
        </span>
        <button
          type="button"
          onClick={() => toggle(product)}
          aria-label={tracked ? 'Remove' : 'Add to watchlist'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
            tracked
              ? 'border-primary-500/30 bg-primary-600 text-background-50'
              : 'border-background-200 bg-background-50 text-foreground-600 hover:text-foreground-950'
          }`}
        >
          <i aria-hidden="true" className={`${tracked ? 'ri-check-line' : 'ri-add-line'} text-sm`}></i>
        </button>
      </div>
    </div>
  );
}