import type { ReactNode } from 'react';
import type { MonitorStatus } from '@/lib/types';
import { pct } from '@/lib/format';

const STATUS_MAP: Record<MonitorStatus, { label: string; className: string; dot: string }> = {
  untracked: { label: 'Not tracked', className: 'bg-background-100 text-foreground-600 border-background-200', dot: 'bg-foreground-400' },
  active: {
    label: 'Active',
    className: 'bg-primary-500/10 text-primary-700 dark:text-primary-400 border-primary-500/20',
    dot: 'bg-primary-500',
  },
  triggered: {
    label: 'Triggered',
    className: 'bg-accent-500/15 text-accent-800 dark:text-accent-400 border-accent-500/25',
    dot: 'bg-accent-500',
  },
  paused: {
    label: 'Paused',
    className: 'bg-background-200 text-foreground-600 border-background-300',
    dot: 'bg-foreground-400',
  },
  unavailable: {
    label: 'Unavailable',
    className: 'bg-danger-100 text-danger-600 border-danger-500/20',
    dot: 'bg-danger-500',
  },
};

export function StatusPill({ status, compact }: { status: MonitorStatus; compact?: boolean }) {
  const item = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${item.className} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[11.5px]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`}></span>
      {item.label}
    </span>
  );
}

export function Delta({ value, suffix, className = '' }: { value: number; suffix?: string; className?: string }) {
  const down = value < 0;
  const flat = Math.abs(value) < 0.05;
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular-nums ${
        flat ? 'text-foreground-500' : down ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600'
      } ${className}`}
    >
      {!flat && <i aria-hidden="true" className={`${down ? 'ri-arrow-down-line' : 'ri-arrow-up-line'} text-xs`}></i>}
      {pct(value)}
      {suffix && <span className="text-foreground-400 font-normal">{suffix}</span>}
    </span>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-background-200 bg-background-100 px-2.5 py-1 text-[11.5px] font-medium text-foreground-600 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground-950">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-foreground-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <span className="w-12 h-12 rounded-xl bg-background-100 border border-background-200 text-foreground-500 flex items-center justify-center mb-4">
        <i aria-hidden="true" className={`${icon} text-[22px]`}></i>
      </span>
      <h3 className="font-heading text-[15px] font-semibold text-foreground-950">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-foreground-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-background-200 bg-background-50 shadow-card ${className}`}>{children}</div>
  );
}