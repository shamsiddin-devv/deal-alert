import ProductImage from '@/components/base/ProductImage';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import { Field, Switch, inputClass } from '@/components/base/Controls';
import { errorMessage } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import type { Preferences, SourceInfo } from '@/lib/contracts';
import { money } from '@/lib/format';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Product } from '@/lib/types';

type Step = 'url' | 'loading' | 'preview' | 'success';

export default function AddProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addProduct, previewProduct, pushToast } = useWorkspace();
  const sources=useApiResource<SourceInfo[]>(open ? "/marketplaces" : null);
  const {data:preferences}=useApiResource<Preferences>(open ? "/me/preferences" : null);
  const [saving,setSaving]=useState(false);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Product | null>(null);
  const [target, setTarget] = useState('');
  const [dropPct, setDropPct] = useState('5');
  const [watchStock, setWatchStock] = useState(true);
  const [watchIncreases, setWatchIncreases] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('url');
      setUrl('');
      setError('');
      setPreview(null);
      setTarget('');
      setDropPct('5');
      setWatchStock(true);
      setWatchIncreases(false);
    }
  }, [open]);

  const handlePreview = async () => {
    if (!url.trim() || step==='loading') { if(!url.trim()) setError('Paste a product link to continue'); return; }
    setError('');setStep('loading');
    try {
      const listing=await previewProduct(url.trim());
      setPreview(listing);
      const defaultDrop = preferences?.defaultDrop ?? 5;
      setTarget(Number.isFinite(listing.price) ? String(Math.max(1, Math.floor(listing.price * (1 - defaultDrop / 100)))) : '');
      setDropPct(String(defaultDrop));
      setStep('preview');
    } catch(cause) {setError(errorMessage(cause));setStep('url');}
  };
  const startTracking = async () => {
    if(!preview || saving) return;
    const targetPrice=Number(target);
    const dropPercent=Number(dropPct);
    if(!Number.isInteger(targetPrice)||targetPrice<1||!Number.isInteger(dropPercent)||dropPercent<1||dropPercent>99) {
      setError('Enter a valid target price and a drop threshold between 1 and 99%.');return;
    }
    setSaving(true);setError('');
    try {
      setPreview(await addProduct({listingId:preview.id,targetPrice,dropPercent,watchStock,watchIncreases}));
      setStep('success');pushToast('Product added to your watchlist');
    } catch(cause) {setError(errorMessage(cause));}
    finally {setSaving(false);}
  };

  const footer = (() => {
    if (step === 'preview') {
      return (
        <>
          <Button variant="secondary" onClick={() => setStep('url')}>
            Back
          </Button>
          <Button onClick={startTracking} disabled={saving} icon="ri-play-circle-line">
            Start tracking
          </Button>
        </>
      );
    }
    if (step === 'success') {
      return (
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              if (preview) navigate(`/app/products/${preview.id}`);
            }}
            iconRight="ri-arrow-right-line"
          >
            Open product
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handlePreview} disabled={step === 'loading'}>
          {step === 'loading' ? 'Reading listing…' : 'Preview product'}
        </Button>
      </>
    );
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'success' ? 'Product added' : 'Track a new product'}
      description={
        step === 'success'
          ? 'The product and your alert conditions have been saved.'
          : 'Paste a product link and we will read the listing details before you confirm.'
      }
      footer={footer}
      width="max-w-xl"
    >
      {step === 'url' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(sources.data ?? []).map((item) => (
              <span
                key={item.source} title={item.enabled ? "Source enabled" : "Live checks disabled"}
                className="rounded-full border border-background-200 bg-background-100 px-2.5 py-1 text-[11px] font-medium text-foreground-600"
              >
                {item.name}{item.enabled ? "" : " · off"}
              </span>
            ))}
          </div>
          {sources.data?.length && !sources.data.some((source) => source.enabled) ? (
            <p className="text-[11.5px] text-foreground-500">Live marketplace checks are unavailable until a source is enabled.</p>
          ) : null}
          <Field label="Product link" hint="Example: https://uzum.uz/uz/product/samsung-galaxy-a55-5g-256gb">
            <div className="relative">
              <i aria-hidden="true" className="ri-link absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"></i>
              <input
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handlePreview();
                }}
                placeholder="https://…"
                className={`${inputClass} pl-9`}
                data-modal-autofocus
              />
            </div>
          </Field>
          {error && (
            <p className="flex items-start gap-1.5 text-[11.5px] text-danger-600">
              <i aria-hidden="true" className="ri-error-warning-line mt-0.5 text-xs"></i>
              {error}
            </p>
          )}
          <div className="rounded-lg border border-background-200 bg-background-100/70 px-3 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-foreground-500">
              <i aria-hidden="true" className="ri-information-line mr-1 text-primary-600 dark:text-primary-400"></i>
              The server checks the listing against the marketplace access policy.
            </p>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-3">
            <div className="skeleton h-14 w-14 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-3/4"></div>
              <div className="skeleton h-2.5 w-1/3"></div>
            </div>
          </div>
          <div className="skeleton h-2.5 w-full"></div>
          <div className="skeleton h-2.5 w-5/6"></div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="skeleton h-12 rounded-lg"></div>
            <div className="skeleton h-12 rounded-lg"></div>
          </div>
          <p className="flex items-center gap-2 pt-2 text-[12px] text-foreground-500">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-background-300 border-t-primary-500 animate-spin"></span>
            Reading title, price, seller and specifications
          </p>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-background-200 bg-background-100/60 p-3">
            <div className="flex gap-3">
              <ProductImage
                src={preview.image || undefined}
                alt={preview.title}
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-lg border border-background-200 object-cover object-top"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground-950">{preview.title}</p>
                <p className="mt-1 text-[11.5px] text-foreground-500">
                  {preview.marketplace} · {preview.seller}{Number.isFinite(preview.sellerRating) ? " · ★ "+preview.sellerRating : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-label text-[13px] font-semibold text-foreground-950">{money(preview.price)}</span>
                  <span className="text-[11px] text-foreground-400 line-through">{money(preview.previousPrice)}</span>
                  <span className="rounded-full bg-primary-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700 dark:text-primary-400">
                    {preview.condition}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-background-200 pt-2.5">
              {preview.specs.slice(0, 3).map((spec) => (
                <span
                  key={spec.label}
                  className="rounded-md border border-background-200 bg-background-50 px-2 py-1 text-[10.5px] text-foreground-600"
                >
                  {spec.label}: {spec.value}
                </span>
              ))}
              <span className="rounded-md border border-background-200 bg-background-50 px-2 py-1 text-[10.5px] text-foreground-600">
                {preview.stock}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Target price (UZS)">
              <input
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value.replace(/[^\d]/g, ''));
                  setError('');
                }}
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
            <Field label="Alert on drop of">
              <div className="relative">
                <input
                  value={dropPct}
                  onChange={(event) => setDropPct(event.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-foreground-400">%</span>
              </div>
            </Field>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-[11.5px] text-danger-600">
              <i aria-hidden="true" className="ri-error-warning-line mt-0.5 text-xs"></i>
              {error}
            </p>
          )}

          <div className="space-y-3 rounded-xl border border-background-200 bg-background-50 p-3.5">
            <Switch
              checked={watchStock}
              onChange={setWatchStock}
              label="Watch availability"
              description="Alert me when this listing goes out of stock or returns."
            />
            <div className="h-px bg-background-200"></div>
            <Switch
              checked={watchIncreases}
              onChange={setWatchIncreases}
              label="Include price increases"
              description="Also notify me when the price moves up significantly."
            />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-400">
            Monitoring runs continuously and every change is written to the price history. Alerts are grouped to avoid
            noise.
          </p>
        </div>
      )}

      {step === 'success' && preview && (
        <div className="py-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/12 text-primary-600 dark:text-primary-400">
            <i aria-hidden="true" className="ri-check-double-line text-2xl"></i>
          </span>
          <h3 className="mt-3 font-heading text-[15px] font-semibold text-foreground-950">{preview.title}</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-foreground-500">
            Now tracking at {money(preview.price)} with a target of {money(Number(target.replace(/\s/g, '')) || preview.price)}.
            History starts from the earliest recorded price.
          </p>
          <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
            {[
              { label: 'Marketplace', value: preview.marketplace.replace(' Market', '') },
              { label: 'Condition', value: preview.condition === 'New' ? 'New' : 'Used' },
              { label: 'Stock', value: preview.stock },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-background-200 bg-background-100 px-2 py-2">
                <p className="text-[9.5px] uppercase tracking-[0.08em] text-foreground-400">{item.label}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-foreground-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
