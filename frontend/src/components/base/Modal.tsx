import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
};

export default function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const opener = document.activeElement;
    const initialFocus = panel.querySelector<HTMLElement>('[data-modal-autofocus]') ?? panel;
    initialFocus.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key !== 'Tab') return;

      const controls = Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]',
      )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;

      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-foreground-950/40 backdrop-blur-[2px] anim-fade"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${width} rounded-t-2xl sm:rounded-2xl border border-background-200 bg-background-50 shadow-pop anim-pop max-h-[92vh] flex flex-col outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-background-200">
          <div className="min-w-0">
            <h2 id={titleId} className="font-heading text-base font-semibold tracking-tight text-foreground-950">{title}</h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-[12.5px] leading-relaxed text-foreground-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:bg-background-100 hover:text-foreground-900 cursor-pointer transition-colors"
          >
            <i aria-hidden="true" className="ri-close-line text-lg"></i>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-5 py-4 border-t border-background-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
