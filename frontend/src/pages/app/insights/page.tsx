import ProductImage from '@/components/base/ProductImage';
import { useApiResource } from '@/hooks/useApiResource';
import ApiStatus from '@/components/base/ApiStatus';
import { productView, type Insights } from '@/lib/contracts';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { money, pct, shortMoney } from '@/lib/format';
import { Delta, Pill } from '@/components/base/Bits';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const periodLabels: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

type TipShape = { active?: boolean; payload?: { payload: { label: string; value: number } }[] };

function MoneyTooltip({ active, payload }: TipShape) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-background-200 bg-background-50 px-2.5 py-1.5 shadow-lift">
      <p className="text-[10px] text-foreground-500">{point.label}</p>
      <p className="font-label text-[11.5px] font-semibold text-foreground-950">{money(point.value)}</p>
    </div>
  );
}

export default function InsightsPage() {
  const {products,revision,refresh}=useWorkspace();
  const [period,setPeriod]=useState<Period>('weekly');
  const resource=useApiResource<Insights>('/insights?period='+period,revision);
  const potential=resource.data?.summary.potentialSavings ?? 0;
  const atTarget=resource.data?.summary.atTarget ?? 0;
  const avgDiscount=resource.data?.summary.averageDiscount ?? 0;
  const opportunities=products.filter(product=>product.score>=75);
  const savingsByProduct=resource.data?.savingsByProduct ?? [];
  const trend=resource.data?.trend ?? [];
  const marketplaceRows=resource.data?.marketplaceRows ?? [];
  const biggestDrops=(resource.data?.biggestDrops ?? []).map(item=>({...item,product:productView(item.product)}));

  return (
    <div className="space-y-4">
      <ApiStatus loading={resource.loading} error={resource.error} retry={refresh}/>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
            Insights & savings
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-foreground-500">
            Where your money could go further. Potential savings are measured against recorded previous prices — confirmed
            savings only appear after an actual purchase.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-background-200 bg-background-50 p-1">
          {(Object.keys(periodLabels) as Period[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                period === key ? 'bg-foreground-950 text-background-50' : 'text-foreground-600 hover:text-foreground-950'
              }`}
            >
              {periodLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Potential savings', value: money(potential), note: 'Across tracked products', icon: 'ri-wallet-3-line', tone: 'primary' },
          { label: 'Confirmed savings', value: money(resource.data?.confirmedSavings), note: 'Recorded purchases', icon: 'ri-shield-check-line' },
          { label: 'Average discount', value: `${avgDiscount.toFixed(1)}%`, note: 'Current vs previous price', icon: 'ri-percent-line' },
          { label: 'At target price', value: `${atTarget} products`, note: 'Conditions currently met', icon: 'ri-focus-3-line' },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-background-200 bg-background-50 p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-foreground-500">{tile.label}</p>
              <i aria-hidden="true" className={`${tile.icon} text-[14px] text-foreground-300`}></i>
            </div>
            <p
              className={`mt-2 font-label font-semibold tracking-tight ${
                tile.tone === 'primary' ? 'text-primary-600 dark:text-primary-400' : 'text-foreground-950'
              } text-[18px]`}
            >
              {tile.value}
            </p>
            <p className="mt-1 text-[10.5px] text-foreground-400">{tile.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-[14.5px] font-semibold text-foreground-950">Potential savings by product</h2>
              <p className="mt-0.5 text-[11px] text-foreground-500">Difference between previous and current recorded price</p>
            </div>
            <Pill className="border-primary-500/20 text-primary-700 dark:text-primary-400">
              <i aria-hidden="true" className="ri-information-line text-[10px]"></i>
              Not confirmed
            </Pill>
          </div>
          <div className="mt-3" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsByProduct} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="oklch(var(--background-300))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: 'oklch(var(--foreground-500))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'oklch(var(--foreground-500))' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(value: number) => shortMoney(value)}
                />
                <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'oklch(var(--background-200) / 0.5)' }} />
                <Bar dataKey="value" fill="oklch(var(--primary-500))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-[14.5px] font-semibold text-foreground-950">
                Savings detected · {periodLabels[period].toLowerCase()}
              </h2>
              <p className="mt-0.5 text-[11px] text-foreground-500">Recorded opportunities by marketplace</p>
            </div>
            <span className="text-[10px] text-foreground-400">live</span>
          </div>
          <div className="mt-3" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="oklch(var(--background-300))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: 'oklch(var(--foreground-500))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'oklch(var(--foreground-500))' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(value: number) => shortMoney(value)}
                />
                <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'oklch(var(--background-200) / 0.5)' }} />
                <Bar dataKey="value" fill="oklch(var(--accent-500))" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-background-200 bg-background-50">
          <div className="px-4 pt-4">
            <h2 className="font-heading text-[14.5px] font-semibold text-foreground-950">Marketplace insight</h2>
            <p className="mt-0.5 text-[11px] text-foreground-500">Where the strongest offers are appearing</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-y border-background-200 bg-background-100/60">
                  {['Marketplace', 'Offers', 'Average price', 'Strong deals'].map((head) => (
                    <th key={head} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-400">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marketplaceRows.map((row) => (
                  <tr key={row.name} className="border-b border-background-200 last:border-0">
                    <td className="px-4 py-2.5 text-[11.5px] font-medium text-foreground-900">{row.name}</td>
                    <td className="px-4 py-2.5 font-label text-[11px] text-foreground-600">{row.offers}</td>
                    <td className="px-4 py-2.5 font-label text-[11px] text-foreground-600">{money(row.avg)}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-primary-500/10 px-1.5 py-0.5 font-label text-[10.5px] font-medium text-primary-700 dark:text-primary-400">
                        {row.best}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[10.5px] leading-relaxed text-foreground-400">
            Average prices are not directly comparable between marketplaces because the offer mix differs.
          </p>
        </div>

        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-[14.5px] font-semibold text-foreground-950">Largest price decreases</h2>
              <p className="mt-0.5 text-[11px] text-foreground-500">Biggest recorded drops among tracked products</p>
            </div>
            <Link to="/app/products" className="text-[11px] font-medium text-foreground-500 hover:text-foreground-950 cursor-pointer">
              Products
            </Link>
          </div>
          <div className="mt-2 divide-y divide-background-200">
            {biggestDrops.map(({ product, events }) => (
              <Link
                key={product.id}
                to={`/app/products/${product.id}`}
                className="flex items-center gap-2.5 py-2.5 cursor-pointer"
              >
                <ProductImage
                  src={product.image || undefined}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium text-foreground-900">{product.title}</p>
                  <p className="text-[10px] text-foreground-400">
                    {product.marketplace} · {events.length} changes · {product.verdict}
                  </p>
                </div>
                <Delta value={product.changePct} className="text-[11px]" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-background-200 bg-background-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Best opportunities now</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opportunities.slice(0, 5).map((product) => (
              <Link
                key={product.id}
                to={`/app/products/${product.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-background-200 bg-background-100 px-2.5 py-1 text-[11px] text-foreground-700 hover:border-background-300 cursor-pointer"
              >
                <span className="font-label font-semibold text-primary-700 dark:text-primary-400">{product.score}</span>
                {product.brand}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-foreground-400">
            Scores combine historical position, discount durability, seller reliability and delivery cost.
          </p>
        </div>

        <div className="rounded-xl border border-accent-500/25 bg-accent-500/[0.07] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-600">
            <i aria-hidden="true" className="ri-error-warning-line text-accent-700 dark:text-accent-400"></i>
            How to read these numbers
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground-700">
            Potential savings use the earlier recorded price. Confirmed savings use the amount paid on a recorded purchase.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill>Reference price: previous recorded</Pill>
            <Pill className="capitalize">Period: {period}</Pill>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-1.5 pb-2 text-[11px] leading-relaxed text-foreground-400">
        <i aria-hidden="true" className="ri-information-line mt-0.5 text-sm"></i>
        Average discount across tracked products: {pct(-avgDiscount)} · statistics reflect recorded marketplace prices.
      </p>
    </div>
  );
}