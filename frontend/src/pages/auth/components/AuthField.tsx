import { useId, useState, type ComponentPropsWithRef } from 'react';

export default function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  icon,
  autoComplete,
  hint,
  maxLength,
  ...inputProps
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  icon?: string;
  autoComplete?: string;
  hint?: string;
  maxLength?: number;
} & Pick<ComponentPropsWithRef<'input'>, 'inputMode' | 'name' | 'pattern' | 'readOnly' | 'ref' | 'required'>) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;

  return (
    <div className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[12.5px] font-medium text-foreground-800">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="text-[11px] text-foreground-400">
            {hint}
          </span>
        )}
      </span>
      <span className="relative block">
        {icon && (
          <i
            aria-hidden="true"
            className={`${icon} pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-foreground-400`}
          ></i>
        )}
        <input
          {...inputProps}
          id={inputId}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`h-10 w-full rounded-lg border bg-background-50 text-[13px] text-foreground-950 outline-none transition-colors duration-150 placeholder:text-foreground-400 focus:ring-2 ${
            icon ? 'pl-9' : 'pl-3'
          } ${isPassword ? 'pr-10' : 'pr-3'} ${
            error
              ? 'border-danger-500/60 focus:border-danger-500 focus:ring-danger-500/15'
              : 'border-background-200 focus:border-primary-500 focus:ring-primary-500/15'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-700 cursor-pointer"
          >
            <i aria-hidden="true" className={`${visible ? 'ri-eye-off-line' : 'ri-eye-line'} text-[15px]`}></i>
          </button>
        )}
      </span>
      {error && (
        <span id={errorId} className="mt-1 flex items-center gap-1 text-[11.5px] text-danger-600">
          <i aria-hidden="true" className="ri-error-warning-line text-xs"></i>
          {error}
        </span>
      )}
    </div>
  );
}
