import { useEffect, useState } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import { Field, Switch, inputClass } from '@/components/base/Controls';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function TargetModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { setTarget, pushToast } = useWorkspace();
  const [value, setValue] = useState('');
  const [notifyStock, setNotifyStock] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const id = product?.id;
  const targetPrice = product?.targetPrice;
  const watchStock = product?.monitoring?.watchStock;

  useEffect(() => {
    if (id) {
      setValue(Number.isFinite(targetPrice) ? String(targetPrice) : '');
      setNotifyStock(watchStock ?? true);
      setError('');
    }
  }, [id, targetPrice, watchStock]);

  const save = async () => {
    if (!product || saving) return;
    const parsed = Number(value.replace(/\s/g, ''));
    if (!parsed || parsed <= 0) {
      setError('Enter a target price above zero');
      return;
    }
    if (parsed > product.price * 1.5) {
      setError('Target is more than 150% of the current price. Choose a lower amount.');
      return;
    }
    setSaving(true);
    try {
      if (!await setTarget(product.id, parsed, notifyStock)) return;
      pushToast(`Target price updated to ${money(parsed)}`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      title="Monitoring conditions"
      description={product ? product.title : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>Save conditions</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-background-200 bg-background-100 px-3 py-2.5">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-foreground-400">Current price</p>
            <p className="mt-0.5 font-label text-[14px] font-semibold text-foreground-950">{product ? money(product.price) : '—'}</p>
          </div>
          <i aria-hidden="true" className="ri-arrow-right-line text-foreground-300"></i>
          <div className="text-right">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-foreground-400">Your target</p>
            <p className="mt-0.5 font-label text-[14px] font-semibold text-primary-600 dark:text-primary-400">
              {value ? money(Number(value)) : '—'}
            </p>
          </div>
        </div>

        <Field label="Target price (UZS)" hint="We alert you when the price reaches or falls below this amount.">
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value.replace(/[^\d]/g, ''));
              setError('');
            }}
            inputMode="numeric"
            className={inputClass}
            data-modal-autofocus
          />
        </Field>
        {error && (
          <p className="flex items-start gap-1.5 text-[11.5px] text-danger-600">
            <i aria-hidden="true" className="ri-error-warning-line mt-0.5 text-xs"></i>
            {error}
          </p>
        )}

        {product && Number.isFinite(product.price) && (
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 15, 20].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setValue(`${Math.round((product.price * (1 - percent / 100)) / 1000) * 1000}`)}
                className="rounded-md border border-background-200 bg-background-50 px-2 py-1 text-[11px] text-foreground-600 transition-colors hover:border-background-300 hover:text-foreground-900 cursor-pointer"
              >
                −{percent}% · {money(Math.round((product.price * (1 - percent / 100)) / 1000) * 1000)}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-background-200 bg-background-50 p-3.5">
          <Switch
            checked={notifyStock}
            onChange={setNotifyStock}
            label="Availability alerts"
            description="Notify me when this listing sells out or returns in stock."
          />
        </div>

        <p className="text-[11px] leading-relaxed text-foreground-400">
          Conditions apply to this listing only. Equivalent offers on other marketplaces are evaluated separately.
        </p>
      </div>
    </Modal>
  );
}
