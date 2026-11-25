import { ValidationError } from './errors/ValidationError';
import type { Source } from './marketplace';

export const STATUSES = [
  'active',
  'triggered',
  'paused',
  'unavailable',
] as const;
export const CONDITIONS = [
  'New',
  'Used — like new',
  'Used',
  'Refurbished',
  'Unknown',
] as const;
export const ALERT_TYPES = [
  'target',
  'historic-low',
  'back-in-stock',
  'better-offer',
  'price-drop',
  'price-increase',
  'unavailable',
] as const;
export const FREQUENCIES = {
  '1h': 60,
  '3h': 180,
  '6h': 360,
  '12h': 720,
  '24h': 1440,
} as const;
export const RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
  all: null,
} as const;
export type Status = (typeof STATUSES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type AlertType = (typeof ALERT_TYPES)[number];
export type Frequency = keyof typeof FREQUENCIES;
export type Range = keyof typeof RANGES;
export type Stock = 'in-stock' | 'out-of-stock' | 'unknown';
export type Spec = { label: string; value: string };
export type ListingDetails = {
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  seller: string | null;
  sellerRating: number | null;
  condition: Condition;
  description: string | null;
  images: string[];
  specs: Spec[];
  delivery: number | null;
  warranty: string | null;
  returns: string | null;
  gtin: string | null;
  mpn: string | null;
};
export type Observation = {
  price: number | null;
  advertisedPrice: number | null;
  stock: Stock;
  details: ListingDetails;
  canonicalUrl?: string;
};
export type Listing = {
  id: string;
  source: Source;
  url: string;
  details: ListingDetails;
  price: number | null;
  previous_price: number | null;
  first_price: number | null;
  low_price: number | null;
  advertised_price: number | null;
  stock: Stock;
  score: number;
  verdict: string;
  match_key: string | null;
  sample_owner_id: string | null;
  last_checked_at: Date | null;
  unavailable_since: Date | null;
};
export type WatchOptions = {
  targetPrice: number;
  dropPercent: number;
  watchStock: boolean;
  watchIncreases: boolean;
  frequency: Frequency;
};
export type Preferences = {
  frequency: Frequency;
  defaultDrop: number;
  autoPause: boolean;
  matchDuplicates: boolean;
  watchVariants: boolean;
  emailAlerts: boolean;
  inApp: boolean;
  drop: boolean;
  target: boolean;
  low: boolean;
  stock: boolean;
  increases: boolean;
  digest: boolean;
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = {
  frequency: '6h',
  defaultDrop: 5,
  autoPause: true,
  matchDuplicates: true,
  watchVariants: false,
  emailAlerts: true,
  inApp: true,
  drop: true,
  target: true,
  low: true,
  stock: true,
  increases: false,
  digest: true,
  theme: 'light',
  reducedMotion: false,
};
export function checkTarget(targetPrice: number, current: number | null) {
  if (
    !Number.isSafeInteger(targetPrice) ||
    targetPrice <= 0 ||
    (current !== null && targetPrice > current * 1.5)
  ) {
    throw new ValidationError(
      'Target price must be positive and at most 150% of the current price',
    );
  }
}

export function pctChange(
  current: number | null,
  previous: number | null,
): number | null {
  return current !== null && previous !== null && previous > 0
    ? Math.round(((current - previous) / previous) * 1000) / 10
    : null;
}

const normalizeKey = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

export function matchKey(details: ListingDetails): string | null {
  if (details.gtin && /^\d{8,14}$/.test(details.gtin))
    return 'gtin:' + details.gtin;
  if (!details.brand) return null;
  if (details.mpn)
    return (
      'mpn:' + normalizeKey(details.brand) + ':' + normalizeKey(details.mpn)
    );
  if (!details.model || details.specs.length === 0) return null;
  const configuration = details.specs
    .filter((spec) =>
      /memory|storage|ram|capacity|xotira|память|накопитель|комплектац/i.test(
        spec.label,
      ),
    )
    .map((spec) => normalizeKey(spec.value))
    .filter(Boolean)
    .sort();
  return configuration.length
    ? [
        'model',
        normalizeKey(details.brand),
        normalizeKey(details.model),
        ...configuration,
      ].join(':')
    : null;
}

export function evaluateDeal(
  next: Observation,
  priorLow: number | null,
  reference: number | null,
) {
  if (next.price === null || next.stock === 'out-of-stock')
    return { score: 0, verdict: 'Currently unavailable' };
  if (reference === null)
    return { score: 0, verdict: 'Not enough price history' };
  const delta = pctChange(next.price, reference) ?? 0;
  if (
    next.advertisedPrice &&
    next.advertisedPrice > reference * 1.12 &&
    delta > -3
  ) {
    return { score: 15, verdict: 'Inflated discount' };
  }
  if (priorLow !== null && next.price < priorLow)
    return {
      score: Math.min(100, 88 + Math.round(Math.max(0, -delta) / 2)),
      verdict: 'Historical low',
    };
  const score = Math.max(0, Math.min(87, Math.round(45 - 3 * delta)));
  return { score, verdict: score >= 75 ? 'Solid drop' : 'Average deal' };
}

export function evaluateAlerts(
  previous: Pick<Listing, 'price' | 'low_price' | 'stock'>,
  next: Observation,
  options: WatchOptions,
  prefs: Preferences,
): AlertType[] {
  const events: AlertType[] = [];
  const change = pctChange(next.price, previous.price);
  if (next.stock !== 'out-of-stock' && next.price !== null) {
    if (
      prefs.target &&
      next.price <= options.targetPrice &&
      (previous.price === null ||
        previous.price > options.targetPrice ||
        previous.stock === 'out-of-stock')
    )
      events.push('target');
    if (
      prefs.low &&
      previous.low_price !== null &&
      next.price < previous.low_price
    )
      events.push('historic-low');
    if (prefs.drop && change !== null && change <= -options.dropPercent)
      events.push('price-drop');
    if (
      prefs.increases &&
      options.watchIncreases &&
      change !== null &&
      change >= 5
    )
      events.push('price-increase');
  }
  if (prefs.stock && options.watchStock) {
    if (previous.stock === 'out-of-stock' && next.stock === 'in-stock')
      events.push('back-in-stock');
    if (previous.stock === 'in-stock' && next.stock === 'out-of-stock')
      events.push('unavailable');
  }
  return events;
}
