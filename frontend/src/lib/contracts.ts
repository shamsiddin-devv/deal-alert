import type { AlertItem, Marketplace, MonitorStatus, PriceEvent, PricePoint, Product } from './types';

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
export type Watch = {
  targetPrice: number;
  dropPercent: number;
  watchStock: boolean;
  watchIncreases: boolean;
  frequency: string;
};
export type Preferences = {
  frequency: string;
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
export type SessionRow = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};
export type SourceInfo = { source: string; name: Marketplace; enabled: boolean; access?: string };
export type CatalogPage = Page<ApiProduct> & {
  averageSaving: number;
  facets: { categories: string[]; brands: string[] };
};
export type AlertPage = Page<AlertItem> & { unread: number; counts: Partial<Record<AlertItem['type'], number>> };
export type ApiProduct = Omit<
  Product,
  | 'seed'
  | 'price'
  | 'previousPrice'
  | 'targetPrice'
  | 'startPrice'
  | 'sellerRating'
  | 'changePct'
  | 'status'
  | 'delivery'
  | 'lastChecked'
  | 'brand'
  | 'model'
  | 'category'
  | 'seller'
  | 'description'
  | 'image'
  | 'warranty'
  | 'returns'
> & {
  price: number | null;
  previousPrice: number | null;
  targetPrice: number | null;
  startPrice: number | null;
  sellerRating: number | null;
  changePct: number | null;
  status: MonitorStatus | null;
  delivery: number | null;
  lastChecked: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  seller: string | null;
  description: string | null;
  image: string | null;
  warranty: string | null;
  returns: string | null;
  historicalLow: number | null;
  monitoring: Watch | null;
};
const absent = (value: string | null) => value ?? '—';
const number = (value: number | null) => value ?? Number.NaN;
export function productView(product: ApiProduct): Product {
  return {
    ...product,
    seed: 0,
    brand: absent(product.brand),
    model: absent(product.model),
    category: absent(product.category),
    seller: absent(product.seller),
    description: absent(product.description),
    image: product.image ?? '',
    warranty: absent(product.warranty),
    returns: absent(product.returns),
    price: number(product.price),
    previousPrice: number(product.previousPrice),
    startPrice: number(product.startPrice),
    targetPrice: number(product.targetPrice),
    sellerRating: number(product.sellerRating),
    changePct: number(product.changePct),
    delivery: number(product.delivery),
    lastChecked: product.lastChecked ?? '',
    status: product.status ?? 'untracked',
  };
}
export type History = {
  points: PricePoint[];
  events: PriceEvent[];
  stats: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    changes: number;
    samples: number;
  };
};
export const emptyHistory: History = {
  points: [],
  events: [],
  stats: { min: null, max: null, avg: null, median: null, changes: 0, samples: 0 },
};
export type WorkspaceEvent = PriceEvent & {
  id: string;
  productId: string;
  title: string;
  source: string;
  checkedAt: string;
};
export type Dashboard = {
  metrics: { tracked: number; active: number; priceDrops: number; potentialSavings: number };
  unread: number;
  monitoringHealth: number | null;
  tracked: ApiProduct[];
  recommended: ApiProduct[];
  recentAlerts: AlertItem[];
  sources: { source: string; healthy: boolean }[];
  recentEvents: Page<WorkspaceEvent>;
};
export type Offer = {
  isSample?: boolean;
  id: string;
  marketplace: Marketplace;
  seller: string | null;
  sellerRating: number | null;
  condition: Product['condition'];
  price: number | null;
  delivery: number | null;
  warranty: string | null;
  returns: string | null;
  stock: string;
  finalCost: number | null;
  best: boolean;
  available: boolean;
  url: string;
};
export type Offers = {
  offers: Offer[];
  bestNew: Offer | null;
  lowestOverall: Offer | null;
  priceSpread: number | null;
};
export type Insights = {
  summary: { potentialSavings: number; averageDiscount: number; atTarget: number; opportunities: number };
  confirmedSavings: number;
  savingsByProduct: { id: string; label: string; value: number }[];
  trend: { label: string; value: number }[];
  marketplaceRows: { source: string; name: Marketplace; offers: number; avg: number | null; best: number }[];
  biggestDrops: { product: ApiProduct; events: PriceEvent[] }[];
};
