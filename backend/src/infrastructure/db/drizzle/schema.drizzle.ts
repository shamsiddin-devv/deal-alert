import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  ListingDetails,
  Preferences,
  WatchOptions,
} from '../../../domain/monitoring';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});
export const sourceEnum = pgEnum('source', [
  'OLX',
  'UZUM',
  'ASAXIY',
  'MEDIAPARK',
  'TEXNOMART',
  'ISHONCH',
  'NOUT',
  'COMPUTERHOUSE',
  'UPG',
]);
export const trackedProductionStatusEnum = pgEnum('tracked_product_statu', [
  'ACTIVE',
  'TRIGGERED',
  'PAUSED',
  'UNAVAILABLE',
]);
export const stockEnum = pgEnum('listing_stock', [
  'in-stock',
  'out-of-stock',
  'unknown',
]);
const stamp = (name: string) => timestamp(name, { withTimezone: true });
const now = (name: string) => stamp(name).defaultNow().notNull();
const id = () => uuid('id').primaryKey().defaultRandom();

export const users = pgTable(
  'users',
  {
    id: id(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 255 }).unique(),
    email: varchar('email', { length: 255 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    telegramId: varchar('telegram_id', { length: 255 }).unique(),
    chatId: varchar('chat_id', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    emailVerifiedAt: stamp('email_verified_at'),
    preferences: jsonb('preferences')
      .$type<Partial<Preferences>>()
      .default({})
      .notNull(),
    avatarMime: varchar('avatar_mime', { length: 32 }),
    avatarBytes: bytea('avatar_bytes'),
  },
  (t) => [uniqueIndex('users_email_folded_uidx').on(sql`lower(${t.email})`)],
);

export const listings = pgTable(
  'market_listings',
  {
    id: id(),
    source: sourceEnum('source').notNull(),
    url: varchar('url', { length: 1000 }).notNull().unique(),
    details: jsonb('details').$type<ListingDetails>().notNull(),
    price: integer('price'),
    previousPrice: integer('previous_price'),
    firstPrice: integer('first_price'),
    lowPrice: integer('low_price'),
    advertisedPrice: integer('advertised_price'),
    stock: stockEnum('stock').default('unknown').notNull(),
    score: integer('score').default(0).notNull(),
    verdict: text('verdict').default('Not enough price history').notNull(),
    matchKey: text('match_key'),
    sampleOwnerId: uuid('sample_owner_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    scheduledAt: now('scheduled_at'),
    lastCheckedAt: stamp('last_checked_at'),
    unavailableSince: stamp('unavailable_since'),
    leaseUntil: stamp('lease_until'),
    leaseToken: uuid('lease_token'),
    failures: integer('failures').default(0).notNull(),
    lastError: varchar('last_error', { length: 64 }),
    createdAt: now('created_at'),
  },
  (t) => [
    index('market_listings_source_schedule_idx').on(t.source, t.scheduledAt),
    index('market_listings_match_idx').on(t.matchKey),
    index('market_listings_sample_owner_idx')
      .on(t.sampleOwnerId)
      .where(sql`${t.sampleOwnerId} is not null`),
    index('market_listings_score_idx').on(t.score, t.id),
    check(
      'market_listing_price_positive',
      sql`${t.price} is null or ${t.price} > 0`,
    ),
    check('market_listing_score_range', sql`${t.score} between 0 and 100`),
  ],
);

export const listingAliases = pgTable(
  'market_listing_aliases',
  {
    url: varchar('url', { length: 1000 }).primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
  },
  (t) => [index('market_listing_aliases_listing_idx').on(t.listingId)],
);

export const trackedProducts = pgTable(
  'tracked_products',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productUrl: varchar('product_url', { length: 1000 }).notNull(),
    productName: varchar('product_name', { length: 500 }),
    source: varchar('source').notNull(),
    targetPrice: integer('target_price').notNull(),
    currentPrice: integer('current_price'),
    status: trackedProductionStatusEnum('status').default('ACTIVE'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
    listingId: uuid('listing_id').references(() => listings.id),
    options: jsonb('options').$type<WatchOptions>(),
  },
  (t) => [
    uniqueIndex('tracked_products_owner_listing_uidx').on(
      t.userId,
      t.listingId,
    ),
    index('tracked_products_listing_status_idx').on(t.listingId, t.status),
  ],
);

export const priceHistory = pgTable('price_history', {
  id: id(),
  trackedProductId: uuid('tracked_product_id')
    .notNull()
    .references(() => trackedProducts.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(),
  checkedAt: timestamp().defaultNow().notNull(),
});

export const observations = pgTable(
  'price_observations',
  {
    id: id(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    price: integer('price'),
    previousPrice: integer('previous_price'),
    stock: stockEnum('stock').notNull(),
    checkedAt: now('checked_at'),
  },
  (t) => [
    uniqueIndex('price_observations_listing_time_uidx').on(
      t.listingId,
      t.checkedAt,
    ),
    check(
      'price_observation_positive',
      sql`${t.price} is null or ${t.price} > 0`,
    ),
  ],
);

export const sessions = pgTable(
  'auth_sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    digest: text('digest').notNull().unique(),
    createdAt: now('created_at'),
    expiresAt: stamp('expires_at').notNull(),
    agent: varchar('agent', { length: 255 }),
  },
  (t) => [index('auth_sessions_user_idx').on(t.userId, t.expiresAt)],
);

export const challenges = pgTable(
  'auth_challenges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 12 }).notNull(),
    digest: text('digest').notNull(),
    expiresAt: stamp('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(5),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
);

export const throttles = pgTable('request_throttles', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: stamp('expires_at').notNull(),
});

export const collections = pgTable(
  'collections',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }).notNull().default(''),
    createdAt: now('created_at'),
  },
  (t) => [
    uniqueIndex('collections_owner_name_uidx').on(
      t.userId,
      sql`lower(${t.name})`,
    ),
  ],
);

export const collectionItems = pgTable(
  'collection_items',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    watchId: uuid('watch_id')
      .notNull()
      .references(() => trackedProducts.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.watchId] }),
    index('collection_items_watch_idx').on(t.watchId),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    watchId: uuid('watch_id').references(() => trackedProducts.id, {
      onDelete: 'set null',
    }),
    listingId: uuid('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    eventKey: text('event_key').notNull(),
    source: sourceEnum('source').notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    oldPrice: integer('old_price'),
    newPrice: integer('new_price'),
    createdAt: now('created_at'),
    readAt: stamp('read_at'),
  },
  (t) => [
    uniqueIndex('alerts_owner_event_uidx').on(t.userId, t.eventKey),
    index('alerts_owner_recent_idx').on(t.userId, t.createdAt),
  ],
);

export const sourceBudgets = pgTable('source_budgets', {
  source: sourceEnum('source').primaryKey(),
  nextRequestAt: now('next_request_at'),
});

export const outbox = pgTable(
  'email_outbox',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    eventKey: text('event_key').notNull().unique(),
    payload: text('payload').notNull(),
    scheduledAt: now('scheduled_at'),
    expiresAt: stamp('expires_at'),
    attempts: integer('attempts').default(0).notNull(),
    leaseToken: uuid('lease_token'),
    leaseUntil: stamp('lease_until'),
    deliveredAt: stamp('delivered_at'),
    failedAt: stamp('failed_at'),
    createdAt: now('created_at'),
  },
  (t) => [
    index('email_outbox_schedule_idx')
      .on(t.scheduledAt)
      .where(sql`${t.deliveredAt} is null and ${t.failedAt} is null`),
  ],
);

export const purchases = pgTable(
  'purchases',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    paid: integer('paid').notNull(),
    referencePrice: integer('reference_price'),
    requestKey: uuid('request_key').notNull(),
    createdAt: now('created_at'),
  },
  (t) => [
    uniqueIndex('purchases_owner_request_uidx').on(t.userId, t.requestKey),
    check('purchases_paid_positive', sql`${t.paid} > 0`),
  ],
);
export const support = pgTable('support_requests', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 120 }).notNull(),
  message: text('message').notNull(),
  createdAt: now('created_at'),
});

export const telegramLinks = pgTable('telegram_link_challenges', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  digest: varchar('digest', { length: 64 }).notNull().unique(),
  expiresAt: stamp('expires_at').notNull(),
});

export const telegramUpdates = pgTable(
  'telegram_updates',
  {
    id: integer('id').primaryKey(),
    receivedAt: now('received_at'),
    completedAt: stamp('completed_at'),
  },
  (t) => [index('telegram_updates_received_at_idx').on(t.receivedAt)],
);
