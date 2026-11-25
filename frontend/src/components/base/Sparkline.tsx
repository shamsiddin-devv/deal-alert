import { Line, LineChart, ResponsiveContainer } from 'recharts';

export default function Sparkline({
  data,
  trend = 'down',
  height = 30,
}: {
  data: { v: number }[];
  trend?: 'down' | 'up' | 'flat';
  height?: number;
}) {
  const stroke =
    trend === 'down'
      ? 'oklch(var(--primary-600))'
      : trend === 'up'
        ? 'oklch(var(--danger-500))'
        : 'oklch(var(--foreground-400))';

  return (
    <div style={{ width: '100%', height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}