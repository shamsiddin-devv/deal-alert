import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PriceChart from '@/components/base/PriceChart';
import { buildSeries, seriesStats, sliceRange, type RangeKey } from '@/lib/history';
import { money } from '@/lib/format';
import { products } from '@/mocks/products';

export default function Hero() {
  const product = products[0];
  const [range, setRange] = useState<RangeKey>('90d');
  const series = useMemo(() => buildSeries(product), [product]);
  const points = useMemo(() => sliceRange(series, range), [series, range]);
  const stats = useMemo(() => seriesStats(series), [series]);

  return (
    <section id="top" className="relative w-full overflow-hidden border-b border-background-200 bg-background-100">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.35]"></div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-background-100 via-background-100/70 to-transparent"></div>

      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[1.02fr_1fr] lg:gap-16 lg:py-20">
        <div className="anim-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-background-300 bg-background-50 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500"></span>
            </span>
            <span className="text-[11.5px] font-medium text-foreground-700">Watching 5 marketplaces in Uzbekistan</span>
          </div>

          <h1 className="mt-5 font-heading text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground-950 sm:text-[46px] lg:text-[54px]">
            Track prices.
            <br />
            Discover better deals.
            <br />
            <span className="text-primary-600 dark:text-primary-400">Never overpay.</span>
          </h1>

          <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-foreground-600">
            Deal Alert follows the products you want across Uzum Market, OLX.uz, Texnomart, Mediapark and Asaxiy. It keeps
            the full price history, separates real discounts from inflated ones, and tells you the moment your price is
            reached.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary-600 px-5 text-[13.5px] font-medium text-background-50 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-background-950 dark:hover:bg-primary-400 cursor-pointer"
            >
              Get started — it&apos;s free
              <i aria-hidden="true" className="ri-arrow-right-line text-sm"></i>
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-background-300 bg-background-50 px-5 text-[13.5px] font-medium text-foreground-900 transition-colors hover:border-background-400 hover:bg-background-50 cursor-pointer"
            >
              Explore features
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { icon: 'ri-check-line', label: 'No card required' },
              { icon: 'ri-shield-check-line', label: '365 days of price history' },
              { icon: 'ri-information-line', label: 'Demo data, no live scraping yet' },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground-500">
                <i aria-hidden="true" className={`${item.icon} text-primary-600 dark:text-primary-400 text-sm`}></i>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative anim-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="absolute -left-3 top-16 z-20 hidden xl:block">
            <div className="rounded-xl border border-background-200 bg-background-50 px-3 py-2.5 shadow-lift">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/12 text-primary-600 dark:text-primary-400">
                  <i aria-hidden="true" className="ri-shield-check-line text-[15px]"></i>
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-foreground-400">Deal score</p>
                  <p className="font-label text-[15px] font-semibold text-foreground-950">94 / 100</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 bottom-14 z-20 hidden xl:block">
            <div className="rounded-xl border border-background-200 bg-background-50 px-3 py-2 shadow-lift">
              <p className="text-[10px] uppercase tracking-[0.12em] text-foreground-400">Saved vs. average</p>
              <p className="font-label text-[14px] font-semibold text-primary-600 dark:text-primary-400">−590 000 UZS</p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-background-200 bg-background-50 p-4 shadow-pop sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-600/10 text-primary-700 dark:text-primary-400">
                  <i aria-hidden="true" className="ri-store-2-line text-[13px]"></i>
                </span>
                <span className="text-[11.5px] font-medium text-foreground-600">{product.marketplace}</span>
                <span className="text-foreground-300">/</span>
                <span className="text-[11.5px] text-foreground-500">{product.condition}</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/20 bg-primary-500/10 px-2 py-0.5 text-[10.5px] font-medium text-primary-700 dark:text-primary-400">
                <span className="h-1 w-1 rounded-full bg-primary-500"></span>
                Tracking
              </span>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <img
                src={product.image}
                alt={product.title}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-lg border border-background-200 object-cover object-top"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[13.5px] font-semibold text-foreground-950">{product.title}</p>
                <p className="mt-0.5 text-[11px] text-foreground-500">
                  {product.seller} · ★ {product.sellerRating}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-label text-[24px] font-semibold leading-none tracking-tight text-foreground-950">
                  {money(product.price)}
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-[11.5px]">
                  <span className="text-foreground-400 line-through">{money(product.previousPrice)}</span>
                  <span className="font-medium text-primary-600 dark:text-primary-400">−17.3%</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">Target</p>
                <p className="font-label text-[12px] font-medium text-foreground-700">{money(product.targetPrice)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-background-200 bg-background-100/60 p-3">
              <PriceChart points={points} range={range} onRangeChange={setRange} height={148} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Lowest', value: stats.min },
                { label: 'Average', value: stats.avg },
                { label: 'Highest', value: stats.max },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-background-200 bg-background-50 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">{item.label}</p>
                  <p className="mt-0.5 truncate font-label text-[11.5px] font-medium text-foreground-900">
                    {money(item.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-accent-500/25 bg-accent-500/10 px-3 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-500/20 text-accent-800 dark:text-accent-400">
                <i aria-hidden="true" className="ri-notification-3-line text-[13px]"></i>
              </span>
              <p className="text-[11.5px] leading-snug text-foreground-800">
                <span className="font-semibold">Target reached.</span> 100 000 UZS below your price, lowest in 214 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}