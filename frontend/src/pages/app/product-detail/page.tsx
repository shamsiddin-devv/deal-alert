import ProductImage from '@/components/base/ProductImage';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { send, errorMessage } from '@/lib/api';
import { productView, emptyHistory, type ApiProduct, type History } from '@/lib/contracts';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import PriceChart from '@/components/base/PriceChart';
import { Delta, EmptyState, Pill, StatusPill } from '@/components/base/Bits';
import { type RangeKey } from '@/lib/history';
import { money, pct, relTime, shortDate } from '@/lib/format';
import TargetModal from '@/pages/app/products/components/TargetModal';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, setStatus, removeProduct, pushToast, perform, revision, refresh, setTracked } = useWorkspace();
  const listing=useApiResource<ApiProduct>(id?'/products/'+id:null,revision);
  const product=useMemo(()=>listing.data?productView(listing.data):undefined,[listing.data]);
  const [range, setRange] = useState<RangeKey>('90d');
  const [imageIndex, setImageIndex] = useState(0);
  const [targetOpen, setTargetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const history=useApiResource<History>(product?'/products/'+product.id+'/history?range='+range:null,revision);
  const {points,stats,events}=history.data ?? emptyHistory;
  const [purchaseOpen,setPurchaseOpen]=useState(false);
  const [paid,setPaid]=useState('');
  const [purchaseError,setPurchaseError]=useState('');
  const [purchaseKey,setPurchaseKey]=useState('');
  const [purchasing,setPurchasing]=useState(false);

  const related = useMemo(
    () =>
      product
        ? products
            .filter((item) => item.id !== product.id && (item.category === product.category || item.brand === product.brand))
            .slice(0, 3)
        : [],
    [products, product],
  );

  if (listing.loading && !product) return <ApiStatus loading/>;
  if (!product) {
    return (
      <div className="rounded-xl border border-background-200 bg-background-50">
        <EmptyState
          icon="ri-error-warning-line"
          title={listing.error ?? "Product not found"}
          body="This product may have been removed from your workspace or the link is no longer valid."
          action={
            <Link to="/app/products">
              <Button size="sm" variant="secondary" icon="ri-arrow-left-line">
                Back to my products
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const paused = product.status === 'paused';
  const gap = product.price - product.targetPrice;
  const reached = gap <= 0;
  const span = Math.max(product.startPrice - product.targetPrice, 1);
  const progress = Number.isFinite(span) && Number.isFinite(gap)
    ? reached ? 100 : Math.min(100, Math.max(0, 100 - (gap / span) * 100))
    : null;

  return (
    <div className="space-y-4">
      <ApiStatus error={history.error} retry={refresh}/>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/app/products"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-foreground-500 hover:text-foreground-950 cursor-pointer"
        >
          <i aria-hidden="true" className="ri-arrow-left-line text-sm"></i>
          My products
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!product.tracked && <Button size="sm" onClick={()=>void setTracked(product.id,true)}>Track product</Button>}
          {product.tracked && <Button size="sm" variant="secondary" onClick={()=>{setPaid('');setPurchaseError('');setPurchaseKey(crypto.randomUUID());setPurchaseOpen(true);}}>Record purchase</Button>}
          <StatusPill status={product.status} />
          <span className="text-[11px] text-foreground-400">Last checked {relTime(product.lastChecked)}</span>
        </div>
      </div>

      {product.status === 'unavailable' && !product.isSample && (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-500/25 bg-danger-500/[0.07] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <i aria-hidden="true" className="ri-forbid-2-line mt-0.5 text-[16px] text-danger-600"></i>
            <div>
              <p className="text-[12.5px] font-medium text-foreground-950">This listing is currently unavailable</p>
              <p className="mt-0.5 text-[11.5px] text-foreground-600">
                Monitoring continues. We will alert you the moment it returns to stock.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon="ri-refresh-line"
            onClick={() => void perform(()=>send('POST','/products/'+product.id+'/check'),'Price check queued')}
          >
            Check now
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full shrink-0 sm:w-[190px]">
              <div className="aspect-square w-full overflow-hidden rounded-xl border border-background-200 bg-background-100">
                <ProductImage
                  src={product.images[imageIndex] ?? product.image}
                  loading="eager"
                  fetchPriority="high"
                  alt={product.title}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="mt-2 flex gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    aria-label={`Image ${index + 1}`}
                    className={`h-12 w-12 overflow-hidden rounded-lg border transition-colors cursor-pointer ${
                      imageIndex === index ? 'border-foreground-950' : 'border-background-200 hover:border-background-300'
                    }`}
                  >
                    <ProductImage src={image} alt="" className="h-full w-full object-cover object-top" />
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill className="border-primary-500/20 text-primary-700 dark:text-primary-400">{product.category}</Pill>
                <Pill>{product.condition}</Pill>
                <Pill>{product.stock}</Pill>
              </div>
              <h1 className="mt-2 font-heading text-[19px] font-semibold leading-snug tracking-[-0.02em] text-foreground-950">
                {product.title}
              </h1>
              <p className="mt-1 text-[11.5px] text-foreground-500">
                {product.brand} · Model {product.model} · {product.marketplace}
              </p>

              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="font-label text-[24px] font-semibold leading-none tracking-tight text-foreground-950">
                  {money(product.price)}
                </span>
                <span className="font-label text-[12px] text-foreground-400 line-through">{money(product.previousPrice)}</span>
                <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 dark:text-primary-400">
                  {pct(-Math.abs(product.changePct))}
                </span>
                {product.delivery === 0 ? (
                  <span className="text-[11px] text-foreground-500">Free delivery</span>
                ) : (
                  <span className="text-[11px] text-foreground-500">{Number.isFinite(product.delivery) ? `+ ${money(product.delivery)} delivery` : 'Delivery cost unavailable'}</span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-background-200 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">Seller</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-medium text-foreground-800">{product.seller}</p>
                  <p className="text-[10.5px] text-foreground-400">{Number.isFinite(product.sellerRating) ? '★ ' + product.sellerRating + ' seller rating' : 'Seller rating unavailable'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">Warranty</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-medium text-foreground-800">{product.warranty}</p>
                  <p className="text-[10.5px] text-foreground-400">{product.returns}</p>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {product.tracked && <>
                <Button size="sm" icon="ri-focus-3-line" onClick={() => setTargetOpen(true)}>
                  Edit target price
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={paused ? 'ri-play-line' : 'ri-pause-line'}
                  onClick={async () => {
                    if(!await setStatus(product.id, paused ? 'active' : 'paused'))return;
                    pushToast(paused ? 'Monitoring resumed' : 'Monitoring paused', 'info');
                  }}
                >
                  {paused ? 'Resume' : 'Pause'}
                </Button>
                </>}
                {!product.isSample && <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-background-200 bg-background-50 px-3 text-[13px] font-medium text-foreground-900 transition-colors hover:bg-background-100 cursor-pointer"
                >
                  <i aria-hidden="true" className="ri-external-link-line text-sm"></i>
                  View listing
                </a>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Price monitoring</p>
                <p className="mt-1 text-[12.5px] text-foreground-600">
                  {!product.tracked ? 'Track this product to set a target.' : !Number.isFinite(gap) ? 'Waiting for a recorded price.' : reached ? 'Your target has been reached.' : `${money(gap)} above your target price.`}
                </p>
              </div>
              <span className="rounded-md border border-primary-500/20 bg-primary-500/[0.07] px-2 py-1 font-label text-[11px] font-semibold text-primary-700 dark:text-primary-400">
                {product.score} / 100
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">Current</p>
                <p className="font-label text-[15px] font-semibold text-foreground-950">{money(product.price)}</p>
              </div>
              <i aria-hidden="true" className="ri-arrow-right-line mb-1.5 text-foreground-300"></i>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">Your target</p>
                <p className="font-label text-[15px] font-semibold text-primary-600 dark:text-primary-400">
                  {money(product.targetPrice)}
                </p>
              </div>
            </div>

            {progress !== null && <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-accent-500' : 'bg-primary-500'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="mt-1.5 text-[10.5px] text-foreground-400">
                {Math.round(progress)}% of the way from the first recorded price to your target
              </p>
            </div>}

            <div className="mt-3 space-y-1.5 border-t border-background-200 pt-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-foreground-500">Condition</span>
                <span className="font-medium text-foreground-800">{product.alertCondition || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-foreground-500">Verdict</span>
                <span className="font-medium text-foreground-800">{product.verdict}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-foreground-500">Labels</span>
                <span className="font-medium text-foreground-800">{product.labels.join(', ') || 'None'}</span>
              </div>
            </div>

            {product.tracked && <button
              type="button"
              onClick={() => setRemoveOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground-400 hover:text-danger-600 cursor-pointer"
            >
              <i aria-hidden="true" className="ri-delete-bin-line text-xs"></i>
              Remove from watchlist
            </button>}
          </div>

          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Historical context</p>
            <div className="mt-2.5 space-y-1.5">
              {[
                { label: 'Lowest recorded', value: stats.min, tone: 'text-primary-600 dark:text-primary-400' },
                { label: 'Average price', value: stats.avg },
                { label: 'Median price', value: stats.median },
                { label: 'Highest recorded', value: stats.max },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-foreground-500">{row.label}</span>
                  <span className={`font-label font-medium ${row.tone ?? 'text-foreground-800'}`}>{money(row.value)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 border-t border-background-200 pt-2.5 text-[10.5px] leading-relaxed text-foreground-400">
              <i aria-hidden="true" className="ri-information-line mt-0.5 text-xs"></i>
              Based on {stats.changes} recorded changes in this range of available history.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-background-200 bg-background-50 p-4">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">Price history</h2>
            <p className="mt-0.5 text-[11.5px] text-foreground-500">
              Every recorded change for this listing, from {shortDate(points[0]?.date ?? '')} to today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Delta value={product.changePct} className="text-[11.5px]" />
            <span className="text-[11px] text-foreground-400">since previous price</span>
          </div>
        </div>
        <PriceChart points={points} range={range} onRangeChange={setRange} target={product.targetPrice} height={260} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">Product information</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground-600">{product.description}</p>
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-start justify-between gap-3 border-b border-background-200 py-2 last:border-0"
                >
                  <span className="text-[11.5px] text-foreground-500">{spec.label}</span>
                  <span className="text-right text-[11.5px] font-medium text-foreground-800">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
              <div>
                <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">Price events</h2>
                <p className="mt-0.5 text-[11.5px] text-foreground-500">Chronological record of recorded price changes</p>
              </div>
              <Link
                to="/app/history"
                className="text-[11.5px] font-medium text-foreground-600 hover:text-foreground-950 cursor-pointer"
              >
                All history
              </Link>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-background-200 bg-background-100/60">
                    {['Date', 'Previous', 'New price', 'Change', '%'].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={`${event.date}-${event.to}`} className="border-b border-background-200 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 text-[11.5px] text-foreground-600">{shortDate(event.date)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-label text-[11px] text-foreground-500">{money(event.from)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-label text-[11px] font-medium text-foreground-950">
                        {money(event.to)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2 font-label text-[11px] ${
                          event.change < 0 ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600'
                        }`}
                      >
                        {event.change < 0 ? '−' : '+'}
                        {money(Math.abs(event.change)).replace(' UZS', '')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Delta value={event.pct} className="text-[11px]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">Delivery & conditions</h2>
            <div className="mt-2.5 space-y-2">
              {[
                {
                  icon: 'ri-truck-line',
                  label: 'Delivery',
                  value: product.delivery === 0 ? 'Free delivery' : money(product.delivery),
                },
                { icon: 'ri-shield-check-line', label: 'Warranty', value: product.warranty },
                { icon: 'ri-arrow-go-back-line', label: 'Returns', value: product.returns },
                { icon: 'ri-store-2-line', label: 'Marketplace', value: product.marketplace },
                { icon: 'ri-user-star-line', label: 'Seller', value: Number.isFinite(product.sellerRating) ? `${product.seller} (★ ${product.sellerRating})` : product.seller },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start gap-2.5 border-b border-background-200 pb-2 last:border-0 last:pb-0"
                >
                  <i aria-hidden="true" className={`${row.icon} mt-0.5 text-[14px] text-foreground-400`}></i>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-foreground-400">{row.label}</p>
                    <p className="text-[11.5px] text-foreground-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">Similar tracked offers</h2>
              <Link to={`/app/compare?product=${product.id}`} className="text-[11px] font-medium text-foreground-500 hover:text-foreground-950 cursor-pointer">
                Compare
              </Link>
            </div>
            <div className="mt-2 divide-y divide-background-200">
              {related.length === 0 && <p className="py-3 text-[11.5px] text-foreground-400">No similar products tracked yet.</p>}
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/app/products/${item.id}`)}
                  className="flex w-full items-center gap-2.5 py-2 text-left cursor-pointer"
                >
                  <ProductImage
                    src={item.image || undefined}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-foreground-900">{item.title}</span>
                    <span className="block text-[10px] text-foreground-400">
                      {item.marketplace} · {item.condition}
                    </span>
                  </span>
                  <span className="shrink-0 font-label text-[11px] font-medium text-foreground-800">{money(item.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={purchaseOpen} onClose={()=>setPurchaseOpen(false)} title="Record a purchase">
        <form className="space-y-3" onSubmit={async event=>{
          event.preventDefault();setPurchasing(true);setPurchaseError('');
          try {await send('POST','/products/'+product.id+'/purchases',{paid:Number(paid),idempotencyKey:purchaseKey});
            refresh();pushToast('Purchase recorded');setPurchaseOpen(false);
          } catch(error){setPurchaseError(errorMessage(error));}
          finally{setPurchasing(false);}
        }}>
          <ApiStatus error={purchaseError||undefined}/>
          <label className="block text-sm">Amount paid (UZS)<input className="mt-1 w-full rounded border border-background-200 p-2" type="number" min={1} required value={paid} onChange={event=>setPaid(event.target.value)}/></label>
          <Button type="submit" disabled={purchasing}>Save purchase</Button>
        </form>
      </Modal>
      <TargetModal product={targetOpen ? product : null} onClose={() => setTargetOpen(false)} />
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove from watchlist"
        description="Monitoring stops and the price history is deleted from your workspace."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if(!await removeProduct(product.id))return;
                setRemoveOpen(false);
                pushToast('Product removed from your workspace', 'info');
                navigate('/app/products');
              }}
            >
              Remove product
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-foreground-600">
          You can always add the listing again later, but the recorded history cannot be restored.
        </p>
      </Modal>
    </div>
  );
}