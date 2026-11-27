import type {
  AlertType,
  Listing,
  Observation,
  Preferences,
  Source,
  WatchOptions,
  Status,
  Range,
} from './types';

export const ACCOUNTS = Symbol('ACCOUNTS');
export const WORKSPACE = Symbol('WORKSPACE');
export const MONITOR = Symbol('MONITOR');
export const SCRAPER = Symbol('SCRAPER');
export const EMAIL = Symbol('EMAIL');
export const SECURITY = Symbol('SECURITY');

export type Account = {
  id: string;
  full_name: string;
  email: string | null;
  password_hash: string | null;
  email_verified_at: Date | null;
  created_at: Date;
  preferences: Partial<Preferences>;
  avatar_mime: string | null;
};
export type Session = { id: string; userId: string };
export type SessionView = {
  id: string;
  created_at: Date;
  expires_at: Date;
  agent: string | null;
};
export type Mail = { to: string; subject: string; text: string; key?: string };
export type ChallengeKind = 'verify' | 'reset';
export type Challenge = {
  digest: string;
  kind: ChallengeKind;
  expires: Date;
  mail: Mail;
};
export type RoleAction = {
  name?: string;
  email?: string;
  verifiedAt?: Date | null;
};
export interface AccountsRepository {
  byEmail(email: string): Promise<Account | null>;
  byId(id: string): Promise<Account | null>;
  register(input: {
    name: string;
    email: string;
    passwordHash: string;
    challenge: Challenge;
  }): Promise<Account>;
  challenge(account: Account, challenge: Challenge): Promise<void>;
  consume(
    email: string,
    kind: ChallengeKind,
    digest: string,
    passwordHash?: string,
  ): Promise<string | null>;
  session(
    userId: string,
    expectedPasswordHash: string,
    hash: string,
    expires: Date,
    agent?: string,
  ): Promise<string | null>;
  identify(hash: string): Promise<Session | null>;
  sessions(userId: string): Promise<SessionView[]>;
  revoke(userId: string, sessionId: string): Promise<void>;
  update(
    userId: string,
    patch: RoleAction,
    challenge?: Challenge,
  ): Promise<Account | null>;
  password(
    userId: string,
    expectedHash: string,
    newHash: string,
    keepSession?: string,
  ): Promise<boolean>;
  preferences(
    userId: string,
    patch: Partial<Preferences>,
  ): Promise<Preferences>;
  setAvatar(userId: string, mime: string, bytes: Buffer): Promise<void>;
  avatar(userId: string): Promise<{ mime: string; bytes: Buffer } | null>;
  delete(userId: string, expectedHash: string): Promise<boolean>;
  throttle(
    key: string,
    maximum: number,
    windowSeconds: number,
  ): Promise<boolean>;
}
export type ListQuery = {
  query?: string;
  marketplaces?: Source[];
  brand?: string;
  category?: string;
  condition?: string;
  min?: number;
  max?: number;
  minDiscount?: number;
  inStock?: boolean;
  histLow?: boolean;
  dropOnly?: boolean;
  sort?: string;
  status?: Status;
  page: number;
  pageSize: number;
};
export type Watch = {
  id: string;
  user_id: string;
  listing_id: string;
  status: Status;
  options: WatchOptions;
};
export type ProductView = Omit<Listing, 'details'> & {
  details: Listing['details'];
  watch_id: string | null;
  watch_status: Status | null;
  options: WatchOptions | null;
  labels: string[];
};
export type Alert = {
  id: string;
  listing_id: string | null;
  source: Source;
  type: AlertType;
  title: string;
  message: string;
  old_price: number | null;
  new_price: number | null;
  created_at: Date;
  read_at: Date | null;
};
export type Collection = {
  id: string;
  name: string;
  description: string;
  productIds: string[];
};
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type PricePoint = { date: string; ts: number; price: number };
export type PriceEvent = {
  date: string;
  from: number;
  to: number;
  change: number;
  pct: number;
};
export type WorkspaceEvent = PriceEvent & {
  id: string;
  productId: string;
  title: string;
  source: Source;
  checkedAt: Date;
};
export type HistoryRead = {
  range: Range;
  points: PricePoint[];
  stats: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    changes: number;
    samples: number;
  };
  events: PriceEvent[];
};
export type DashboardRead = {
  metrics: {
    tracked: number;
    active: number;
    priceDrops: number;
    potentialSavings: number;
  };
  unread: number;
  sources: { source: Source; healthy: boolean }[];
  tracked: ProductView[];
  recommended: ProductView[];
  recentEvents: Page<WorkspaceEvent>;
  monitoringHealth: number | null;
};
export type InsightsRead = {
  summary: {
    potentialSavings: number;
    atTarget: number;
    averageDiscount: number;
    opportunities: number;
  };
  confirmedSavings: number;
  marketplaceRows: {
    source: Source;
    offers: number;
    avg: number | null;
    best: number;
  }[];
  savingsByProduct: { id: string; label: string; value: number }[];
  trend: { label: string; value: number }[];
  biggestDrops: ProductView[];
};
export interface WorkspaceRepository {
  product(userId: string, id: string): Promise<ProductView | null>;
  list(
    userId: string,
    query: ListQuery,
    tracked: boolean,
  ): Promise<Page<ProductView> & { averageSaving: number }>;
  facets(userId: string): Promise<{ brands: string[]; categories: string[] }>;
  add(
    userId: string,
    listing: Listing,
    options: WatchOptions,
    status: Status,
  ): Promise<void>;
  change(
    userId: string,
    id: string,
    options?: WatchOptions,
    status?: Status,
  ): Promise<boolean>;
  bulk(
    userId: string,
    ids: string[],
    action: 'pause' | 'resume' | 'remove',
  ): Promise<void>;
  history(id: string, range: Range): Promise<HistoryRead>;
  events(
    userId: string,
    range: Range,
    query: ListQuery,
  ): Promise<Page<WorkspaceEvent>>;
  offers(userId: string, product: Listing): Promise<Listing[]>;
  requestCheck(userId: string, id: string): Promise<boolean>;
  collections(userId: string): Promise<Collection[]>;
  createCollection(
    userId: string,
    name: string,
    description: string,
  ): Promise<Collection>;
  editCollection(
    userId: string,
    id: string,
    patch: { name?: string; description?: string },
  ): Promise<boolean>;
  removeCollection(userId: string, id: string): Promise<boolean>;
  collectionItem(
    userId: string,
    id: string,
    listingId: string,
    add: boolean,
  ): Promise<boolean>;
  alerts(
    userId: string,
    filters: {
      types?: AlertType[];
      unread?: boolean;
      page: number;
      pageSize: number;
    },
  ): Promise<Page<Alert> & { unread: number; counts: Record<string, number> }>;
  alertRead(userId: string, id: string | null, read: boolean): Promise<boolean>;
  removeAlert(userId: string, id: string): Promise<boolean>;
  analytics(userId: string, period: Period): Promise<InsightsRead>;
  dashboard(userId: string): Promise<DashboardRead>;
  purchase(
    userId: string,
    listing: Listing,
    paid: number,
    key: string,
  ): Promise<{ id: string }>;
  support(
    userId: string,
    subject: string,
    message: string,
  ): Promise<{ id: string }>;
  export(userId: string): Promise<unknown>;
}
export type Lease = {
  id: string;
  source: Source;
  url: string;
  leaseToken: string;
  failures: number;
  lastError: string | null;
  listing: Listing;
};
export type OutboxJob = Mail & { id: string; token: string; attempts: number };
export interface MonitorRepository {
  byUrl(url: string): Promise<Listing | null>;
  savePreview(
    source: Source,
    url: string,
    observation: Observation,
    alias?: string,
  ): Promise<Listing>;
  lease(sources: Source[], limit: number): Promise<Lease[]>;
  complete(lease: Lease, observation: Observation): Promise<void>;
  fail(lease: Lease, code: string, retryMs: number): Promise<void>;
  reserve(source: Source, spacingMs: number): Promise<boolean>;
  cooldown(source: Source, milliseconds: number): Promise<void>;
  outbox(limit: number): Promise<OutboxJob[]>;
  finishMail(job: OutboxJob, delivered: boolean): Promise<void>;
  queueDigests(week: string): Promise<void>;
  prune(): Promise<void>;
}
export interface MarketplaceGateway {
  enabled(): Source[];
  read(source: Source, url: URL): Promise<Observation>;
}
export interface MailGateway {
  available(): boolean;
  send(message: Mail): Promise<void>;
}
