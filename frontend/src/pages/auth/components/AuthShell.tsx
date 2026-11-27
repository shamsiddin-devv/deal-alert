import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-background-100 lg:grid lg:grid-cols-[1fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-4 py-7 sm:px-8 lg:px-14 lg:py-10">
        <Link to="/" className="inline-flex w-fit items-center gap-2.5 cursor-pointer">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground-950 text-background-50">
            <i aria-hidden="true" className="ri-price-tag-3-line text-[15px]"></i>
          </span>
          <span className="font-heading text-[16px] font-semibold tracking-tight text-foreground-950">Deal Alert</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[390px] anim-fade-up">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 font-heading text-[26px] font-semibold tracking-[-0.025em] text-foreground-950">
              {title}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-background-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-foreground-400">Demo environment · prices are sample data</p>
          <div className="flex items-center gap-3">
            <a href="#top" className="text-[11px] text-foreground-500 hover:text-foreground-900 cursor-pointer">
              Privacy
            </a>
            <a href="#top" className="text-[11px] text-foreground-500 hover:text-foreground-900 cursor-pointer">
              Terms
            </a>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-foreground-950 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary-500 blur-3xl"></div>
          <div className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-accent-500 blur-3xl"></div>
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-background-50/20 px-2.5 py-1 text-[11px] font-medium text-background-200">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400"></span>
            Price intelligence workspace
          </span>
          <h2 className="mt-5 max-w-sm font-heading text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] text-background-50 xl:text-[34px]">
            The price you pay should never be a guess.
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-background-300">
            Keep every product you care about in one workspace with its full price history, seller details and comparison
            across five marketplaces.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              '365 days of recorded price movement per product',
              'Real discounts separated from inflated ones',
              'Target price, drop and back-in-stock alerts',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-background-200">
                <i aria-hidden="true" className="ri-checkbox-circle-line mt-0.5 text-[15px] text-primary-400"></i>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 rounded-xl border border-background-50/15 bg-background-50/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-background-400">Latest alert</p>
            <span className="font-label text-[10.5px] text-background-400">2 min ago</span>
          </div>
          <p className="mt-2 text-[12.5px] font-medium text-background-50">Samsung Galaxy A55 reached your target</p>
          <div className="mt-2 flex items-center gap-2 font-label text-[12px]">
            <span className="text-background-400 line-through">4 490 000</span>
            <i aria-hidden="true" className="ri-arrow-right-line text-[11px] text-background-400"></i>
            <span className="text-primary-300">4 290 000 UZS</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-background-400">
            Lowest price in 214 days · 12% below the 90-day average on Uzum Market.
          </p>
        </div>

        <div className="relative mt-8 flex items-center gap-2 text-[11px] text-background-400">
          <i aria-hidden="true" className="ri-lock-2-line text-sm"></i>
          Your workspace is private. Demonstration data only.
        </div>
      </aside>
    </div>
  );
}