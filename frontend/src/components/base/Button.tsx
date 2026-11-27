import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
  block?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-background-50 hover:bg-primary-700 dark:bg-primary-500 dark:text-background-950 dark:hover:bg-primary-400',
  secondary:
    'bg-background-50 text-foreground-900 border border-background-200 hover:border-background-300 hover:bg-background-100',
  ghost: 'text-foreground-700 hover:bg-background-100 hover:text-foreground-950',
  danger: 'bg-danger-500 text-background-50 hover:opacity-90',
  inverse: 'bg-foreground-950 text-background-50 hover:bg-foreground-800',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  block,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <i aria-hidden="true" className={`${icon} text-base leading-none`}></i>}
      {children}
      {iconRight && <i aria-hidden="true" className={`${iconRight} text-base leading-none`}></i>}
    </button>
  );
}