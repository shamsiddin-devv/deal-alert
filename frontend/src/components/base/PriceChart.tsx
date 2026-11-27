import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PricePoint } from '@/lib/types';
import { money, shortDate, shortMoney } from '@/lib/format';
import { RANGES, type RangeKey } from '@/lib/history';

type TooltipShape = { active?: boolean; payload?: { payload: PricePoint }[] };

function ChartTooltip({ active, payload }: TooltipShape) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-background-200 bg-background-50 px-3 py-2 shadow-lift">
      <p className="text-[11px] font-medium text-foreground-500">{shortDate(point.date)}</p>
      <p className="font-label text-[13px] font-semibold text-foreground-950 mt-0.5">{money(point.price)}</p>
    </div>
  );
}

type PriceChartProps = {
  points: PricePoint[];
  range?: RangeKey;
  onRangeChange?: (key: RangeKey) => void;
  target?: number;
  height?: number;
  showRanges?: boolean;
};

export default function PriceChart({
  points,
  range,
  onRangeChange,
  target,
  height = 240,
  showRanges = true,
}: PriceChartProps) {
  const data = points.map((point) => ({ ...point, label: shortDate(point.date) }));

  return (
    <div className="w-full">
      {showRanges && (
        <div className="flex flex-wrap items-center gap-1 mb-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-background-100 border border-background-200">
            {RANGES.map((item) => {
              const active = range === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onRangeChange?.(item.key)}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 ${
                    active
                      ? 'bg-background-50 text-foreground-950 shadow-card'
                      : 'text-foreground-500 hover:text-foreground-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {data.length === 0 ? (
        <div className="grid place-items-center text-[12px] text-foreground-500" style={{ height }}>
          No recorded prices for this period.
        </div>
      ) : (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="oklch(var(--background-300))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10.5, fill: 'oklch(var(--foreground-500))' }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 10.5, fill: 'oklch(var(--foreground-500))' }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(value: number) => shortMoney(value)}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'oklch(var(--foreground-300))', strokeWidth: 1 }} />
            {Number.isFinite(target) ? (
              <ReferenceLine
                y={target}
                stroke="oklch(var(--accent-500))"
                strokeDasharray="4 4"
                label={{
                  value: 'Target',
                  position: 'insideTopRight',
                  fill: 'oklch(var(--accent-700))',
                  fontSize: 10,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="price"
              stroke="oklch(var(--primary-600))"
              strokeWidth={1.8}
              fill="oklch(var(--primary-500))"
              fillOpacity={0.12}
              activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'oklch(var(--background-50))', fill: 'oklch(var(--primary-600))' }}
              isAnimationActive
              animationDuration={550}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}