import { relations } from 'drizzle-orm';
import { uuid, pgEnum, pgTable, varchar, timestamp, primaryKey, integer } from 'drizzle-orm/pg-core';

// Enums
export const sourceEnum = pgEnum('source', [
  'OLX',
  'UZUM',
  'ASAXIY',
  'MEDIAPARK',
  'TEXNOMART',
  'ISHONCH',
  'NOUT',
  'COMPUTERHOUSE',
  'UPG'
]);

export const trackedProductionStatusEnum = pgEnum('tracked_product_statu', [
  'ACTIVE',
  'TRIGGERED',
  'PAUSED',
])

// Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', {length: 255}).notNull(),
  phoneNumber: varchar('phone_number', {length: 255}).notNull().unique(),
  email: varchar('email', {length: 255}).unique(),
  passwordHash: varchar('password_hash', {length: 255}),
  telegramId: varchar('telegram_id', {length: 255}).unique(),
  chatId: varchar('chat_id', {length: 100}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const trackedProducts = pgTable('tracked_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
  productUrl: varchar('product_url', {length: 1000}).notNull(),
  productName: varchar('product_name', { length: 500 }),
  source: varchar('source').notNull(),
  targetPrice: integer('target_price').notNull(),
  currentPrice: integer('current_price'),
  status: trackedProductionStatusEnum('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull()
});

export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackedProductId: uuid('tracked_product_id').notNull().references(() => trackedProducts.id, {onDelete: 'cascade'}),
  price: integer('price').notNull(),
  checkedAt: timestamp().defaultNow().notNull()
});

// Relations
export const userRelatinos = relations(users, ({many}) => ({
  trackedProducts: many(trackedProducts)
}));

export const trackedProductRelations = relations(trackedProducts, ({one, many}) => ({
  user: one(users, {
    fields: [trackedProducts.userId],
    references: [users.id]
  }),
  priceHistory: many(priceHistory)
}))

export const priceHistoryRelations = relations(priceHistory, ({one}) => ({
  trackedProduct: one(trackedProducts, {
    fields: [priceHistory.trackedProductId],
    references: [trackedProducts.id]
  }),
}));