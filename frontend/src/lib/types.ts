export type Marketplace = 'Uzum Market' | 'OLX.uz' | 'Texnomart' | 'Mediapark' | 'Asaxiy' | 'ISHONCH' | 'NOUT.uz' | 'ComputerHouse' | 'UPG';
export type Condition = 'New' | 'Used — like new' | 'Used' | 'Refurbished' | 'Unknown';
export type MonitorStatus = 'active' | 'paused' | 'triggered' | 'unavailable' | 'untracked';

export type User = {
  id: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  name: string;
  email: string;
  plan: string;
  joined: string;
};

export type Product = {
  isSample?: boolean;
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  marketplace: Marketplace;
  seller: string;
  sellerRating: number;
  condition: Condition;
  price: number;
  previousPrice: number;
  startPrice: number;
  targetPrice: number;
  seed: number;
  score: number;
  verdict: string;
  stock: string;
  image: string;
  images: string[];
  description: string;
  specs: { label: string; value: string }[];
  delivery: number;
  warranty: string;
  returns: string;
  url: string;
  status: MonitorStatus;
  changePct: number;
  lastChecked: string;
  tracked: boolean;
  labels: string[];
  alertCondition: string;
  historicalLow?: number | null;
  monitoring?: { watchStock: boolean } | null;
};

export type PricePoint = { date: string; ts: number; price: number };
export type PriceEvent = { date: string; from: number; to: number; change: number; pct: number };

export type AlertType =
  | 'target'
  | 'historic-low'
  | 'back-in-stock'
  | 'better-offer'
  | 'price-drop'
  | 'price-increase'
  | 'unavailable';

export type AlertItem = {
  id: string;
  type: AlertType;
  productId: string | null;
  title: string;
  message: string;
  oldPrice: number | null;
  newPrice: number | null;
  marketplace: Marketplace;
  createdAt: string;
  read: boolean;
};

export type Collection = { id: string; name: string; description: string; productIds: string[] };
