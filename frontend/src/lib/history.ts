import type { PriceEvent, PricePoint, Product } from './types';

const TODAY = new Date('2026-11-24T12:00:00Z');

const seeded = (input: number) => {
  let seed = input;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function buildSeries(product: Product, days = 365): PricePoint[] {
  const rand = seeded(product.seed);
  const points: PricePoint[] = [];
  const span = Math.max(days - 1, 1);

  for (let i = days - 1; i >= 0; i -= 1) {
    const elapsed = days - 1 - i;
    const progress = elapsed / span;
    const trend = product.startPrice + (product.price - product.startPrice) * progress;
    const wave = Math.sin(elapsed / 9) * product.startPrice * 0.024;
    const noise = (rand() - 0.5) * product.startPrice * 0.014;
    let value = trend + wave + noise;
    if (rand() > 0.972) value -= product.startPrice * 0.045;
    if (rand() > 0.985) value += product.startPrice * 0.03;

    const date = new Date(TODAY);
    date.setUTCDate(date.getUTCDate() - i);
    points.push({
      date: date.toISOString().slice(0, 10),
      ts: date.getTime(),
      price: Math.max(1000, Math.round(value / 1000) * 1000),
    });
  }

  const last = points[points.length - 1];
  points[points.length - 1] = { ...last, price: product.price };
  return points;
}

export type SeriesStats = { min: number; max: number; avg: number; median: number; changes: number };

export function seriesStats(points: PricePoint[]): SeriesStats {
  if (points.length === 0) return { min: 0, max: 0, avg: 0, median: 0, changes: 0 };
  const prices = points.map((point) => point.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const middle = Math.floor(sorted.length / 2);
  let changes = 0;
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i] !== prices[i - 1]) changes += 1;
  }
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(total / prices.length),
    median: Math.round(sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]),
    changes,
  };
}

export const RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: 365 },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

export function sliceRange(points: PricePoint[], key: RangeKey): PricePoint[] {
  const range = RANGES.find((item) => item.key === key) ?? RANGES[4];
  const cutoff = TODAY.getTime() - range.days * 24 * 3600 * 1000;
  const filtered = points.filter((point) => point.ts >= cutoff);
  return filtered.length > 1 ? filtered : points.slice(-2);
}

export function priceEvents(points: PricePoint[], limit = 8): PriceEvent[] {
  const events: PriceEvent[] = [];
  for (let i = points.length - 1; i > 0 && events.length < limit; i -= 1) {
    const current = points[i];
    const previous = points[i - 1];
    if (current.price !== previous.price) {
      events.push({
        date: current.date,
        from: previous.price,
        to: current.price,
        change: current.price - previous.price,
        pct: ((current.price - previous.price) / previous.price) * 100,
      });
    }
  }
  return events;
}

export function sparkline(points: PricePoint[], count = 24): { v: number }[] {
  const step = Math.max(1, Math.floor(points.length / count));
  const sampled = points.filter((_, index) => index % step === 0).slice(-count);
  return sampled.map((point) => ({ v: point.price }));
}