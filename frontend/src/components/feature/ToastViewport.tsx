import { useWorkspace } from '@/contexts/WorkspaceContext';

const toneMap = {
  success: { icon: 'ri-check-line', className: 'text-primary-600 dark:text-primary-400 bg-primary-500/10' },
  info: { icon: 'ri-information-line', className: 'text-secondary-600 dark:text-secondary-400 bg-secondary-500/10' },
  error: { icon: 'ri-error-warning-line', className: 'text-danger-600 bg-danger-500/10' },
};

export default function ToastViewport() {
  const { toasts, dismissToast } = useWorkspace();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-[120] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-80">
      {toasts.map((toast) => {
        const tone = toneMap[toast.tone];
        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 rounded-xl border border-background-200 bg-background-50 px-3.5 py-3 shadow-pop anim-pop"
          >
            <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${tone.className}`}>
              <i aria-hidden="true" className={`${tone.icon} text-sm`}></i>
            </span>
            <p className="flex-1 text-[12.5px] leading-relaxed text-foreground-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="text-foreground-400 hover:text-foreground-800 cursor-pointer"
            >
              <i aria-hidden="true" className="ri-close-line text-sm"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}