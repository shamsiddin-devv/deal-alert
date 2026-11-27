import { z } from 'zod';
import { SOURCES, MARKETPLACES, type Source } from '../../domain/marketplace';
import {
  ALERT_TYPES,
  CONDITIONS,
  FREQUENCIES,
  RANGES,
  STATUSES,
} from '../../domain/monitoring';
import { DomainError } from '../../domain/errors/DomainError';

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new RequestValidation(
      result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    );
  }
  return result.data;
}
export class RequestValidation extends DomainError {
  constructor(readonly details: { field: string; message: string }[]) {
    super('Please correct the submitted fields', 422, 'VALIDATION_ERROR');
  }
}

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const email = z.string().trim().max(254).email();
export const password = z
  .string()
  .min(6)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value) <= 72,
    'Password exceeds 72 UTF-8 bytes',
  );
const existingPassword = z.string().min(1).max(72);
export const uuid = z.uuid();
const pageNumber = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && /^[0-9]+$/.test(value)
        ? Number(value)
        : value,
    z.number().int().min(1).max(max),
  );
const flag = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);
const money = z.number().int().positive().max(2147483647);
const amountQuery = z.preprocess(
  (value) =>
    typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value,
  money,
);
const frequency = z.enum(
  Object.keys(FREQUENCIES) as (keyof typeof FREQUENCIES)[],
);
export const range = z
  .enum(Object.keys(RANGES) as (keyof typeof RANGES)[])
  .default('90d');
export const period = z
  .enum(['daily', 'weekly', 'monthly', 'yearly'])
  .default('weekly');
const url = z.url().max(1000);
const toSource = (value: string) =>
  SOURCES.find(
    (source) =>
      source === value.toLowerCase() ||
      MARKETPLACES[source].name.toLowerCase() === value.toLowerCase(),
  );
const sourceList = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.split(',') : value),
    z.array(z.string()).max(9),
  )
  .transform((values, ctx) => {
    const sources: Source[] = [];
    for (const value of values) {
      const source = toSource(value.trim());
      if (!source) {
        ctx.addIssue({ code: 'custom', message: 'Unknown marketplace' });
        return z.NEVER;
      }
      if (!sources.includes(source)) sources.push(source);
    }
    return sources;
  });
const paging = {
  page: pageNumber(10000).default(1),
  pageSize: pageNumber(100).default(20),
};
export const register = z.strictObject({
  name: text(120, 2),
  email,
  password,
  terms: z.literal(true),
});
export const login = z.strictObject({
  email,
  password: existingPassword,
  remember: z.boolean().default(false),
});
export const challenge = z.strictObject({ email });
export const verify = z.strictObject({
  email,
  code: z.string().regex(/^\d{6}$/),
});
export const reset = z.strictObject({
  email,
  password,
  token: z.string().regex(/^[\w-]{43}$/),
});
export const profilePatch = z
  .strictObject({
    name: text(120, 2).optional(),
    email: email.optional(),
    currentPassword: existingPassword.optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.email !== undefined,
    'Provide a display name or email address',
  );
export const changePassword = z.strictObject({
  currentPassword: existingPassword,
  password,
});
export const provePassword = z.strictObject({
  currentPassword: existingPassword,
});

const prefsFlags = {
  autoPause: z.boolean(),
  matchDuplicates: z.boolean(),
  watchVariants: z.boolean(),
  emailAlerts: z.boolean(),
  inApp: z.boolean(),
  drop: z.boolean(),
  target: z.boolean(),
  low: z.boolean(),
  stock: z.boolean(),
  increases: z.boolean(),
  digest: z.boolean(),
  reducedMotion: z.boolean(),
};
export const preferences = z
  .strictObject({
    ...prefsFlags,
    frequency,
    defaultDrop: z.number().int().min(1).max(99),
    theme: z.enum(['light', 'dark', 'system']),
  })
  .partial();

const watchFields = {
  targetPrice: money,
  dropPercent: z.number().int().min(1).max(99),
  watchStock: z.boolean(),
  watchIncreases: z.boolean(),
  frequency,
};
export const preview = z.strictObject({ url });
export const addProduct = z
  .strictObject({ ...watchFields, listingId: uuid, url })
  .partial()
  .refine(
    (data) => Boolean(data.listingId) !== Boolean(data.url),
    'Provide either listingId or url',
  );
export const patchProduct = z
  .strictObject({ ...watchFields, status: z.enum(['active', 'paused']) })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Provide at least one change',
  );
export const bulk = z.strictObject({
  ids: z
    .array(uuid)
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate product IDs'),
  action: z.enum(['pause', 'resume', 'remove']),
});
export const productQuery = z.strictObject({
  ...paging,
  query: text(120).optional(),
  status: z.enum(STATUSES).optional(),
  sort: z.enum(['recent', 'change', 'price', 'name']).optional(),
});
export const dealQuery = z
  .strictObject({
    ...paging,
    query: text(120).optional(),
    marketplaces: sourceList.optional(),
    brand: text(120).optional(),
    category: text(120).optional(),
    condition: z.enum([...CONDITIONS, 'all']).optional(),
    min: amountQuery.optional(),
    max: amountQuery.optional(),
    minDiscount: pageNumber(100).optional(),
    inStock: flag.optional(),
    histLow: flag.optional(),
    dropOnly: flag.optional(),
    sort: z
      .enum(['score', 'discount', 'price-asc', 'change', 'recent'])
      .optional(),
  })
  .refine(
    (data) =>
      data.min === undefined || data.max === undefined || data.min <= data.max,
    'Minimum price cannot exceed maximum',
  );
export const searchQuery = z.strictObject({
  query: text(120),
  page: pageNumber(10000).default(1),
  pageSize: pageNumber(100).default(8),
});
export const eventQuery = z.strictObject({
  ...paging,
  range,
  query: text(120).optional(),
  marketplaces: sourceList.optional(),
});
export const alertQuery = z.strictObject({
  ...paging,
  unread: flag.optional(),
  types: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.split(',') : value),
      z.array(z.enum(ALERT_TYPES)).max(7),
    )
    .optional(),
});
export const alertPatch = z.strictObject({ read: z.boolean() });
export const collection = z.strictObject({
  name: text(100),
  description: text(500, 0).default(''),
});
export const collectionPatch = collection
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Provide a name or description',
  );
export const purchase = z.strictObject({ paid: money, idempotencyKey: uuid });
export const support = z.strictObject({
  subject: text(120, 3),
  message: text(4000, 10),
});
export const avatar = z.strictObject({
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  data: z
    .string()
    .max(175000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
