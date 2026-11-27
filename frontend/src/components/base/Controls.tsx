import type { ReactNode, SelectHTMLAttributes } from 'react';

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="min-w-0">
          {label && <p className="text-[13px] font-medium text-foreground-900">{label}</p>}
          {description && <p className="mt-0.5 text-[12px] leading-relaxed text-foreground-500">{description}</p>}
        </div>
      )}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label ?? 'Toggle'}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
          checked ? 'bg-primary-600 dark:bg-primary-500' : 'bg-background-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background-50 shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        ></span>
      </button>
    </div>
  );
}

type Option = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  label,
  className = '',
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  return (
    <div className={`relative ${className}`}>
      {label && <span className="sr-only">{label}</span>}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="w-full h-9 appearance-none rounded-lg border border-background-200 bg-background-50 pl-3 pr-8 text-[13px] text-foreground-900 outline-none cursor-pointer transition-colors duration-150 hover:border-background-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <i aria-hidden="true" className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-foreground-500 pointer-events-none text-base"></i>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[12.5px] font-medium text-foreground-800 mb-1.5">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-foreground-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full h-10 rounded-lg border border-background-200 bg-background-50 px-3 text-[13px] text-foreground-950 placeholder:text-foreground-400 outline-none transition-colors duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';