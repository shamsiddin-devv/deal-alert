import { useMemo, useState } from 'react';
import PriceChart from '@/components/base/PriceChart';
import { buildSeries, seriesStats, sliceRange, type RangeKey } from '@/lib/history';
import { money } from '@/lib/format';
import { products } from '@/mocks/products';
import { showcaseProduct } from '@/mocks/landing';

const evidence = [
  { icon: 'ri-history-line', text: 'Lowest price recorded in the last 214 days' },
  { icon: 'ri-line-chart-line', text: '12% below the 90-day average price' },
  { icon: 'ri-shield-check-line', text: 'Discount held for 6 consecutive days, not a one-hour flash' },
  { icon: 'ri-links-line', text: 'No cheaper equivalent offer on the other four marketplaces' },
];

export function TrackingShowcase() {
  const product = products[0];
  const [range, setRange] = useState<RangeKey>('90d');
  const series = useMemo(() => buildSeries(product), [product]);
  const points = useMemo(() => sliceRange(series, range), [series, range]);
  const stats = useMemo(() => seriesStats(series), [series]);

  return (
    <section id="tracking" className="w-full border-b border-background-200 bg-foreground-950">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-background-50/20 px-2.5 py-1 text-[11px] font-medium text-background-200">
              <i aria-hidden="true" className="ri-error-warning-line text-accent-400"></i>
              Fake discounts are the default
            </p>
            <h2 className="mt-4 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-background-50 md:text-[34px]">
              A 35% discount means nothing without the history behind it
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-background-300">
              Many listings raise the price for two weeks, then advertise a dramatic reduction back to the old level. Deal
              Alert compares every offer against the real recorded history, so you can tell a genuine drop from a marketing
              trick.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-background-50/15 bg-background-50/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-medium text-background-100">Inflated discount</p>
                  <span className="rounded-full bg-danger-500/15 px-2 py-0.5 font-label text-[11px] font-semibold text-danger-500">
                    Score 32
                  </span>
                </div>
                <p className="mt-1.5 font-label text-[12.5px] text-background-300">
                  9 490 000 → 8 990 000 UZS
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-background-400">
                  Price was 9 290 000 eight weeks ago. The “sale” is still above the yearly average.
                </p>
              </div>
              <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-medium text-background-50">Genuine drop</p>
                  <span className="rounded-full bg-primary-500/20 px-2 py-0.5 font-label text-[11px] font-semibold text-primary-300">
                    Score 94
                  </span>
                </div>
                <p className="mt-1.5 font-label text-[12.5px] text-background-200">5 190 000 → 4 290 000 UZS</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-background-300">
                  Lowest price in 214 days, below every previous campaign on all five marketplaces.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-background-200 bg-background-50 p-4 shadow-pop sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={product.image}
                  alt={product.title}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-lg border border-background-200 object-cover object-top"
                />
                <div className="min-w-0">
                  <p className="truncate font-heading text-[13.5px] font-semibold text-foreground-950">{product.title}</p>
                  <p className="mt-0.5 text-[11px] text-foreground-500">
                    {product.marketplace} · {product.seller}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-label text-[15px] font-semibold text-foreground-950">{money(product.price)}</p>
                <p className="text-[11px] text-foreground-400 line-through">{money(product.previousPrice)}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-background-200 pt-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-400">Price history</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-foreground-500">
                  <i aria-hidden="true" className="ri-database-2-line text-xs"></i>
                  {stats.changes} recorded changes
                </span>
              </div>
              <PriceChart points={points} range={range} onRangeChange={setRange} height={210} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Lowest', value: stats.min },
                { label: 'Average', value: stats.avg },
                { label: 'Median', value: stats.median },
                { label: 'Highest', value: stats.max },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-background-200 bg-background-100/70 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-foreground-400">{item.label}</p>
                  <p className="mt-0.5 truncate font-label text-[11.5px] font-medium text-foreground-900">
                    {money(item.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-background-200 bg-background-100/60 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-400">
                Why this deal is real
              </p>
              <ul className="mt-2.5 space-y-2">
                {evidence.map((item) => (
                  <li key={item.text} className="flex items-start gap-2">
                    <i aria-hidden="true" className={`${item.icon} mt-0.5 text-[13px] text-primary-600 dark:text-primary-400`}></i>
                    <span className="text-[12px] leading-relaxed text-foreground-600">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComparisonShowcase() {
  return (
    <section id="compare" className="w-full border-b border-background-200 bg-background-50">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
              Cross-marketplace comparison
            </p>
            <h2 className="mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground-950 md:text-[34px]">
              One product, five stores, the real final cost
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-foreground-600">{showcaseProduct.note}</p>
          </div>
          <div className="shrink-0 rounded-lg border border-background-200 bg-background-100 px-3 py-2">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-foreground-400">Best offer</p>
            <p className="mt-0.5 text-[12px] font-medium text-foreground-900">
              Uzum Market · {money(showcaseProduct.rows[0].price)}
            </p>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-xl border border-background-200 bg-background-50">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-background-200 bg-background-100/70">
                  {['Marketplace', 'Seller', 'Condition', 'Price', 'Delivery', 'Final cost', 'Warranty'].map((head) => (
                    <th
                      key={head}
                      className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-foreground-400"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {showcaseProduct.rows.map((row) => (
                  <tr
                    key={row.marketplace}
                    className={`border-b border-background-200 last:border-0 ${
                      row.best ? 'bg-primary-500/[0.06]' : 'hover:bg-background-100/60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-foreground-900">{row.marketplace}</span>
                        {row.best && (
                          <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-background-50">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-foreground-500">{row.seller}</td>
                    <td className="px-4 py-3 text-[12px] text-foreground-600">{row.condition}</td>
                    <td className="px-4 py-3 font-label text-[12px] text-foreground-800">{money(row.price)}</td>
                    <td className="px-4 py-3 text-[12px] text-foreground-500">
                      {row.delivery === 0 ? 'Free' : money(row.delivery)}
                    </td>
                    <td className="px-4 py-3 font-label text-[12px] font-medium text-foreground-950">
                      {money(row.price + row.delivery)}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-foreground-500">{row.warranty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-background-200 md:hidden">
            {showcaseProduct.rows.map((row) => (
              <div key={row.marketplace} className={`p-4 ${row.best ? 'bg-primary-500/[0.06]' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground-950">{row.marketplace}</p>
                  {row.best && (
                    <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-background-50">
                      Best
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px] text-foreground-500">
                  {row.seller} · {row.condition}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="font-label text-[14px] font-semibold text-foreground-950">{money(row.price)}</p>
                    <p className="text-[11px] text-foreground-400">
                      Delivery {row.delivery === 0 ? 'free' : money(row.delivery)}
                    </p>
                  </div>
                  <p className="font-label text-[12px] text-foreground-700">{money(row.price + row.delivery)} final</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-foreground-400">
          <i aria-hidden="true" className="ri-information-line mt-0.5 text-sm"></i>
          The used OLX listing is cheaper, but it carries no warranty — it is never merged with new offers or marked as the
          best price.
        </p>
      </div>
    </section>
  );
}