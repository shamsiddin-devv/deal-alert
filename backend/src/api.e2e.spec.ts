import { InputFile } from 'grammy';
import { createTelegramBot } from './infrastructure/telegram/telegram-bot';
import {
  TelegramLinkService,
  TELEGRAM_ACCOUNTS,
  type TelegramAccounts,
} from './application/telegram-link.service';
import { WorkspaceService } from './application/workspace.service';
import { PGlite } from '@electric-sql/pglite';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import request from 'supertest';
import { AppModule } from './app.module';
import { configure } from './bootstrap';
import {
  MONITOR,
  SCRAPER,
  type MarketplaceGateway,
  type MonitorRepository,
} from './application/ports';
import {
  DATABASE,
  DrizzleService,
  type Database,
} from './infrastructure/db/drizzle/drizzle.service';
import type { Observation } from './domain/monitoring';
import { ScrapeError } from './domain/errors/ScrapeError';

jest.setTimeout(45000);
const migrationsFolder = 'src/infrastructure/db/drizzle/migrations';
const fixture: Observation = {
  price: 1000000,
  stock: 'in-stock',
  advertisedPrice: 1250000,
  details: {
    title: 'Example Galaxy 256 GB',
    brand: 'Example',
    model: 'EX-256',
    category: 'Smartphones',
    seller: 'Official store',
    sellerRating: 4.8,
    condition: 'New',
    description: 'An example listing',
    images: [],
    specs: [{ label: 'Storage', value: '256GB' }],
    delivery: 25000,
    warranty: '12 months',
    returns: '14 days',
    gtin: '1234567890123',
    mpn: null,
  },
};
const listingUrl = 'https://asaxiy.uz/product/example-galaxy-256';
const alias = listingUrl + '-alias';
const fakeGateway: MarketplaceGateway = {
  enabled: () => ['asaxiy'],
  read: (source, url) => {
    if (source !== 'asaxiy')
      return Promise.reject(new ScrapeError('SOURCE_NOT_APPROVED'));
    return Promise.resolve(
      url.href === alias ? { ...fixture, canonicalUrl: listingUrl } : fixture,
    );
  },
};
const authHeader = (token: string) => 'Bearer ' + token;
const userShape = (email: string) => ({
  name: 'Test Account',
  email,
  password: 'test-password-2304',
  terms: true,
});

describe('Deal Alert HTTP and PostgreSQL schema', () => {
  let app: NestExpressApplication;
  let pg: PGlite;
  let db: Database;
  let http: ReturnType<typeof request>;
  let monitor: MonitorRepository;
  let owner: string;
  let other: string;
  let id: string;
  let collectionId: string;
  let alertId: string;

  beforeAll(async () => {
    process.env.APP_SECRET = 'integration-test-separate-key-at-least-32-bytes';
    process.env.APP_ORIGIN = 'http://localhost:5173';
    process.env.WORKERS_DISABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = '12345:integration-test-token';
    process.env.TELEGRAM_BOT_USERNAME = 'DealAlertTestBot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'telegram-integration-webhook-secret';
    process.env.TELEGRAM_AUTO_WEBHOOK = 'false';
    pg = new PGlite();
    await migrate(drizzle(pg), { migrationsFolder });
    await migrate(drizzle(pg), { migrationsFolder });
    db = {
      query: async <T>(query: string, params?: unknown[]) =>
        (await pg.query<T>(query, params)).rows,
      transaction: async <T>(
        callback: (
          client: import('./infrastructure/db/drizzle/drizzle.service').Sql,
        ) => Promise<T>,
      ) =>
        pg.transaction((tx) =>
          callback({
            query: async <R>(query: string, params?: unknown[]) =>
              (await tx.query<R>(query, params)).rows,
          }),
        ),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DrizzleService)
      .useValue(db)
      .overrideProvider(DATABASE)
      .useValue(db)
      .overrideProvider(SCRAPER)
      .useValue(fakeGateway)
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configure(app);
    await app.init();
    http = request(app.getHttpServer());
    monitor = app.get<MonitorRepository>(MONITOR);
  });

  afterAll(async () => {
    await app?.close();
    await pg?.close();
  });

  async function register(email: string) {
    await http.post('/api/auth/register').send(userShape(email)).expect(202);
    await http.post('/api/auth/login').send(userShape(email)).expect(422);
    await http
      .post('/api/auth/login')
      .send({ email, password: userShape(email).password })
      .expect(403);
    const jobs = await monitor.outbox(20);
    const job = jobs.find(
      (message) => message.to === email && message.subject.startsWith('Verify'),
    );
    expect(job).toBeDefined();
    await monitor.finishMail(job!, true);
    const code = /\b\d{6}\b/.exec(job!.text)![0];
    const result = await http
      .post('/api/auth/verify-email')
      .send({ email, code })
      .expect(200);
    await http.post('/api/auth/verify-email').send({ email, code }).expect(401);
    return (result.body as { accessToken: string }).accessToken;
  }

  it('migrates, creates an account, verifies an expiring one-use code, and protects private routes', async () => {
    await http.get('/api/health/ready').expect(200);
    await http.get('/api/products').expect(401);
    owner = await register('owner@example.test');
    other = await register('other@example.test');
    await http
      .get('/api/me')
      .set('Authorization', authHeader(owner))
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({
          email: 'owner@example.test',
          emailVerified: true,
        }),
      );
    await http
      .get('/api/marketplaces')
      .expect(200)
      .expect(({ body }: { body: unknown }) => expect(body).toHaveLength(9));
    await http
      .patch('/api/me/preferences')
      .set('Authorization', authHeader(owner))
      .send({ frequency: '1h', drop: true, emailAlerts: true })
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ frequency: '1h' }),
      );
  });

  it('uses an HttpOnly session for browser login and rejects foreign origins', async () => {
    const origin = 'http://localhost:5173';
    const credentials = {
      email: 'owner@example.test',
      password: userShape('').password,
      remember: true,
    };
    await http
      .post('/api/auth/login')
      .set('Origin', 'https://foreign.example.test')
      .set('X-Deal-Client', 'browser')
      .send(credentials)
      .expect(403);
    const browser = request.agent(app.getHttpServer());
    const login = await browser
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Deal-Client', 'browser')
      .send(credentials)
      .expect(200);
    expect(login.body).not.toHaveProperty('accessToken');
    expect(login.headers['set-cookie']?.[0]).toMatch(
      /dealalert_session=.+; Path=\/api; Expires=.+; HttpOnly; SameSite=Lax/,
    );
    await browser.get('/api/me').expect(200);
    await browser
      .patch('/api/me/preferences')
      .set('Origin', 'https://foreign.example.test')
      .send({ theme: 'dark' })
      .expect(403);
    await browser
      .patch('/api/me/preferences')
      .set('Origin', origin)
      .send({ theme: 'light' })
      .expect(200);
    await browser.post('/api/auth/logout').set('Origin', origin).expect(204);
    await browser.get('/api/me').expect(401);
  });

  it('deduplicates preview aliases, stores one watch, and enforces membership ownership', async () => {
    const headers = authHeader(owner);
    await http
      .post('/api/products/preview')
      .set('Authorization', headers)
      .send({ url: 'https://olx.uz/obyavlenie/example' })
      .expect(403);
    const preview = await http
      .post('/api/products/preview')
      .set('Authorization', headers)
      .send({ url: alias })
      .expect(200);
    id = (preview.body as { id: string }).id;
    await http
      .post('/api/products/preview')
      .set('Authorization', headers)
      .send({ url: listingUrl })
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ id, price: 1000000 }),
      );
    for (let n = 0; n < 2; n++)
      await http
        .post('/api/products')
        .set('Authorization', headers)
        .send({ listingId: id, targetPrice: 900000 })
        .expect(201);
    await http
      .get('/api/products?sort=name')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ total: 1 }),
      );
    await http
      .get('/api/products')
      .set('Authorization', authHeader(other))
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ total: 0 }),
      );
    await http
      .patch('/api/products/' + id)
      .set('Authorization', headers)
      .send({ targetPrice: 2000000 })
      .expect(422);
    await http
      .patch('/api/products/' + id)
      .set('Authorization', authHeader(other))
      .send({ status: 'paused' })
      .expect(404);
    const collection = await http
      .post('/api/collections')
      .set('Authorization', headers)
      .send({ name: 'Personal' })
      .expect(201);
    collectionId = (collection.body as { id: string }).id;
    const link = '/api/collections/' + collectionId + '/products/' + id;
    await http.put(link).set('Authorization', authHeader(other)).expect(404);
    await http.put(link).set('Authorization', headers).expect(204);
    await http
      .get('/api/collections')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toEqual([
          expect.objectContaining({ id: collectionId, productIds: [id] }),
        ]),
      );
  });

  it('fences job retries, persists prices and matches alerts to the owning user', async () => {
    await db.query(
      "update market_listings set scheduled_at=now()-interval '1 minute' where id=$1",
      [id],
    );
    const [a, b] = await Promise.all([
      monitor.lease(['asaxiy'], 1),
      monitor.lease(['asaxiy'], 1),
    ]);
    expect(a.length + b.length).toBe(1);
    const first = a[0] ?? b[0];
    await monitor.fail(first, 'TEST_RETRY', 60000);
    expect(await monitor.lease(['asaxiy'], 1)).toHaveLength(0);
    await db.query(
      "update market_listings set scheduled_at=now()-interval '1 minute' where id=$1",
      [id],
    );
    const [lease] = await monitor.lease(['asaxiy'], 1);
    expect(lease.leaseToken).not.toEqual(first.leaseToken);
    await monitor.complete(first, { ...fixture, price: 100000 });
    await monitor.complete(lease, { ...fixture, price: 850000 });
    await monitor.complete(lease, { ...fixture, price: 850000 });
    const headers = authHeader(owner);
    await http
      .get('/api/products/' + id)
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({
          status: 'triggered',
          price: 850000,
          previousPrice: 1000000,
        }),
      );
    await http
      .get('/api/products/' + id + '/history')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({
          stats: { min: 850000, max: 1000000, samples: 2 },
        }),
      );
    await http
      .get('/api/history')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ total: 1 }),
      );
    await http
      .get('/api/deals?marketplaces=Asaxiy&minDiscount=10&sort=discount')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ total: 1 }),
      );
    await http
      .get('/api/products/' + id + '/offers')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ bestNew: { finalCost: 875000 } }),
      );
    const alerts = await http
      .get('/api/alerts?types=target&unread=true')
      .set('Authorization', headers)
      .expect(200);
    alertId = (alerts.body as { items: { id: string }[] }).items[0].id;
    await http
      .patch('/api/alerts/' + alertId)
      .set('Authorization', authHeader(other))
      .send({ read: true })
      .expect(404);
    await http
      .patch('/api/alerts/' + alertId)
      .set('Authorization', headers)
      .send({ read: true })
      .expect(204);
    await http
      .patch('/api/alerts/' + alertId)
      .set('Authorization', headers)
      .send({ read: false })
      .expect(204);
    await http
      .post('/api/alerts/read-all')
      .set('Authorization', headers)
      .expect(204);
    await http
      .get('/api/dashboard')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({
          unread: 0,
          metrics: { tracked: 1, potentialSavings: 150000 },
        }),
      );
    await http
      .get('/api/insights?period=weekly')
      .set('Authorization', headers)
      .expect(200);
    const purchase = {
      paid: 840000,
      idempotencyKey: 'c7e11735-533e-4803-8f98-2016d2e03dd2',
    };
    const a1 = await http
      .post('/api/products/' + id + '/purchases')
      .set('Authorization', headers)
      .send(purchase)
      .expect(201);
    const a2 = await http
      .post('/api/products/' + id + '/purchases')
      .set('Authorization', headers)
      .send(purchase)
      .expect(201);
    expect(a2.body).toEqual(a1.body);
    await http
      .get('/api/insights?period=weekly')
      .set('Authorization', headers)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ confirmedSavings: 160000 }),
      );
    await http
      .get('/api/products/export')
      .set('Authorization', headers)
      .expect(200)
      .expect('Content-Type', /csv/);
  });

  it('scopes example products and facets to the sample owner', async () => {
    const auth = authHeader(owner);
    const guest = authHeader(other);
    const [{ id: userId }] = await db.query<{ id: string }>(
      'select id from users where email=$1',
      ['owner@example.test'],
    );
    const [{ id: demoId }] = await db.query<{ id: string }>(
      "insert into market_listings(source,url,details,price,stock,sample_owner_id,last_checked_at) values('ASAXIY',$1,$2,100000,'in-stock',$3,now()) returning id",
      [
        'https://deal-alert-demo.invalid/uz/private-product',
        JSON.stringify({
          ...fixture.details,
          title: 'Private test product',
          brand: 'Private fixture brand',
        }),
        userId,
      ],
    );
    try {
      await http
        .get('/api/products/' + demoId)
        .set('Authorization', auth)
        .expect(200)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ isSample: true }),
        );
      await http
        .get('/api/products/' + demoId)
        .set('Authorization', guest)
        .expect(404);
      await http
        .get('/api/search?query=Private%20test%20product')
        .set('Authorization', guest)
        .expect(200)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ items: [] }),
        );
      const ownerFacets = await http
        .get('/api/deals')
        .set('Authorization', auth)
        .expect(200);
      const otherFacets = await http
        .get('/api/deals')
        .set('Authorization', guest)
        .expect(200);
      const ownerBrands = (ownerFacets.body as { facets: { brands: string[] } })
        .facets.brands;
      const otherBrands = (otherFacets.body as { facets: { brands: string[] } })
        .facets.brands;
      expect(ownerBrands).toContain('Private fixture brand');
      expect(otherBrands).not.toContain('Private fixture brand');
    } finally {
      await db.query('delete from market_listings where id=$1', [demoId]);
    }
  });

  it('links Telegram once, authorizes photo cards, and deduplicates webhook receipts', async () => {
    const auth = authHeader(owner);
    const otherAuth = authHeader(other);
    const telegram = app.get(TelegramLinkService);
    const accounts = app.get<TelegramAccounts>(TELEGRAM_ACCOUNTS);
    const workspace = app.get(WorkspaceService);
    const sender = { id: 7531029, is_bot: false, first_name: 'Test chat' };
    const chat = {
      id: sender.id,
      type: 'private' as const,
      first_name: sender.first_name,
    };
    const identity = {
      id: 12345,
      is_bot: true as const,
      first_name: 'Deal Alert',
      username: 'DealAlertTestBot',
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
    };
    const [{ id: userId }] = await db.query<{ id: string }>(
      'select id from users where email=$1',
      ['owner@example.test'],
    );
    const [{ id: photoProduct }] = await db.query<{ id: string }>(
      "insert into market_listings(source,url,details,price,stock,sample_owner_id,last_checked_at) values('ASAXIY',$1,$2,100000,'in-stock',$3,now()) returning id",
      [
        'https://deal-alert-demo.invalid/uz/telegram-card',
        JSON.stringify({
          ...fixture.details,
          title: 'Telegram sample product',
          images: ['/images/products/da-a55-main.jpg'],
        }),
        userId,
      ],
    );
    const first = await http
      .post('/api/me/telegram/link')
      .set('Authorization', auth)
      .expect(200);
    const token = new URL((first.body as { url: string }).url).searchParams
      .get('start')!
      .slice(2);
    expect(await telegram.consume(token, sender.id)).toBe('linked');
    expect(await telegram.consume(token, sender.id)).toBe('invalid');
    expect(await telegram.owner(sender.id)).toBe(userId);
    const another = await http
      .post('/api/me/telegram/link')
      .set('Authorization', otherAuth)
      .expect(200);
    const second = new URL((another.body as { url: string }).url).searchParams
      .get('start')!
      .slice(2);
    expect(await telegram.consume(second, sender.id)).toBe('conflict');
    await http
      .get('/api/me/telegram')
      .set('Authorization', auth)
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(body).toMatchObject({ enabled: true, linked: true }),
      );
    await http
      .post('/api/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'incorrect')
      .send({ update_id: 1 })
      .expect(403);
    expect(await accounts.claimUpdate(777)).toBe('claimed');
    expect(await accounts.claimUpdate(777)).toBe('leased');
    await accounts.completeUpdate(777);
    expect(await accounts.claimUpdate(777)).toBe('done');
    const calls: { method: string; payload: unknown }[] = [];
    const bot = createTelegramBot(
      '12345:integration-test-token',
      telegram,
      workspace,
      { botInfo: identity },
    );
    bot.api.config.use((previous, method, payload) => {
      calls.push({ method, payload });
      return Promise.resolve({ ok: true, result: true } as Awaited<
        ReturnType<typeof previous>
      >);
    });
    const stamp = Math.floor(Date.now() / 1000);
    await bot.handleUpdate({
      update_id: 9000,
      message: {
        message_id: 1,
        date: stamp,
        chat,
        from: sender,
        text: '/menu',
        entities: [{ type: 'bot_command', offset: 0, length: 5 }],
      },
    });
    const menu = calls.find((call) => call.method === 'sendMessage')
      ?.payload as {
      reply_markup: { inline_keyboard: { style?: string }[][] };
    };
    expect(
      menu.reply_markup.inline_keyboard[0].map((button) => button.style),
    ).toEqual(['primary', 'success']);
    await bot.handleUpdate({
      update_id: 9001,
      callback_query: {
        id: 'test-callback',
        chat_instance: 'fixture',
        from: sender,
        data: 'item:' + photoProduct,
        message: {
          message_id: 2,
          date: stamp,
          chat,
          from: identity,
          text: 'Deal Alert',
        },
      },
    });
    const photo = calls.find((call) => call.method === 'sendPhoto')
      ?.payload as { photo: unknown; caption: string };
    expect(photo.photo).toBeInstanceOf(InputFile);
    expect(photo.caption).toContain('Telegram sample product');
    expect(calls.some((call) => call.method === 'answerCallbackQuery')).toBe(
      true,
    );
    expect(calls.some((call) => call.method === 'deleteMessage')).toBe(true);
    await http
      .delete('/api/me/telegram')
      .set('Authorization', auth)
      .expect(204);
    expect(await telegram.owner(sender.id)).toBeNull();
    await db.query('delete from market_listings where id=$1', [photoProduct]);
  });

  it('uses password reset tokens once, revokes sessions, and removes personal records on deletion', async () => {
    const email = 'owner@example.test';
    await http.post('/api/auth/forgot-password').send({ email }).expect(202);
    const [job] = (await monitor.outbox(20)).filter((item) =>
      item.subject.startsWith('Reset'),
    );
    const url = new URL(/https?:\/\/\S+/.exec(job.text)![0]);
    const reset = {
      email,
      token: url.searchParams.get('token'),
      password: 'replacement-8896',
    };
    await http.post('/api/auth/reset-password').send(reset).expect(200);
    await http
      .get('/api/me')
      .set('Authorization', authHeader(owner))
      .expect(401);
    await http.post('/api/auth/reset-password').send(reset).expect(401);
    const result = await http
      .post('/api/auth/login')
      .send({ email, password: reset.password })
      .expect(200);
    const token = authHeader(
      (result.body as { accessToken: string }).accessToken,
    );
    await http.get('/api/me/export').set('Authorization', token).expect(200);
    await http
      .delete('/api/me')
      .set('Authorization', token)
      .send({ currentPassword: reset.password })
      .expect(204);
    await http.get('/api/me').set('Authorization', token).expect(401);
    expect(
      await db.query('select id from collections where id=$1', [collectionId]),
    ).toHaveLength(0);
    expect(
      await db.query('select id from alerts where id=$1', [alertId]),
    ).toHaveLength(0);
  });
});
