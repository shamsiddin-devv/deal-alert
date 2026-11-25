import { Inject, Injectable } from '@nestjs/common';
import {
  MONITOR,
  SCRAPER,
  WORKSPACE,
  type ListQuery,
  type MarketplaceGateway,
  type MonitorRepository,
  type ProductView,
  type WorkspaceRepository,
} from './ports';
import { AuthService } from './auth.service';
import { listingUrl, MARKETPLACES } from '../domain/marketplace';
import {
  checkTarget,
  pctChange,
  type Listing,
  type Status,
  type WatchOptions,
} from '../domain/monitoring';
import { TrackedProduct } from '../domain/entities/TrackedProduct';
import { DomainError } from '../domain/errors/DomainError';
import { NotFoundError } from '../domain/errors/NotFoundError';
import { ScrapeError } from '../domain/errors/ScrapeError';

const stockLabels = {
  'in-stock': 'In stock',
  'out-of-stock': 'Unavailable',
  unknown: 'Unknown',
} as const;

export function productDto(row: Listing | ProductView) {
  const watch = 'watch_id' in row ? row : null;
  const options = watch?.options ?? null;
  const { images, ...details } = row.details;
  return {
    ...details,
    id: row.id,
    source: row.source,
    isSample: row.sample_owner_id != null,
    marketplace: MARKETPLACES[row.source].name,
    price: row.price,
    previousPrice: row.previous_price,
    startPrice: row.first_price,
    historicalLow: row.low_price,
    advertisedPrice: row.advertised_price,
    score: row.score,
    verdict: row.verdict,
    stock: stockLabels[row.stock],
    availability: row.stock,
    url: row.url,
    lastChecked: row.last_checked_at,
    changePct: pctChange(row.price, row.previous_price),
    image: images[0] ?? null,
    images,
    tracked: Boolean(watch?.watch_id),
    labels: watch?.labels ?? [],
    status:
      watch?.watch_status ??
      (row.stock === 'out-of-stock' ? 'unavailable' : null),
    targetPrice: options?.targetPrice ?? null,
    alertCondition: options
      ? 'Target price ' +
        options.targetPrice +
        ' UZS' +
        (options.watchStock ? ' · availability' : '')
      : '',
    monitoring: options,
  };
}

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(WORKSPACE) readonly repository: WorkspaceRepository,
    @Inject(MONITOR) private readonly monitor: MonitorRepository,
    @Inject(SCRAPER) private readonly scraper: MarketplaceGateway,
    private readonly auth: AuthService,
  ) {}

  async requireProduct(userId: string, id: string) {
    const product = await this.repository.product(userId, id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async list(userId: string, query: ListQuery, tracked: boolean) {
    const data = await this.repository.list(userId, query, tracked);
    return { ...data, items: data.items.map(productDto) };
  }

  async preview(input: string) {
    const { source, url } = listingUrl(input);
    const cached = await this.monitor.byUrl(url.href);
    if (cached?.last_checked_at) return cached;
    const sample = await this.scrape(source, url);
    return this.monitor.savePreview(
      source,
      sample.canonicalUrl ?? url.href,
      sample,
      url.href,
    );
  }

  private async scrape(source: Listing['source'], url: URL) {
    try {
      return await this.scraper.read(source, url);
    } catch (error) {
      if (error instanceof ScrapeError) {
        const status =
          error.code === 'SOURCE_NOT_APPROVED' ||
          error.code === 'ROBOTS_DISALLOWED' ||
          error.code === 'SOURCE_ACCESS_DENIED'
            ? 403
            : error.code === 'LISTING_NOT_FOUND'
              ? 404
              : error.code === 'SOURCE_RATE_LIMIT' ||
                  error.code === 'SOURCE_THROTTLED'
                ? 429
                : 503;
        throw new DomainError(
          'This listing could not be read from the marketplace',
          status,
          error.code,
        );
      }
      if (error instanceof Error) {
        throw new DomainError(
          'The marketplace is temporarily unreachable',
          503,
          'SOURCE_UNREACHABLE',
        );
      }
      throw error;
    }
  }

  async add(
    userId: string,
    input: Partial<WatchOptions> & { listingId?: string; url?: string },
  ) {
    await this.auth.limit('product-add', userId, 40, 3600);
    const prefs = await this.auth.preferences(userId);
    const url = input.url ? listingUrl(input.url).url : undefined;
    if (url && !prefs.watchVariants) url.search = '';
    const listing = input.listingId
      ? await this.requireProduct(userId, input.listingId)
      : await this.preview(url!.href);
    const targetPrice =
      input.targetPrice ??
      (listing.price === null
        ? 0
        : Math.max(1, Math.floor(listing.price * 0.95)));
    const options: WatchOptions = {
      targetPrice,
      dropPercent: input.dropPercent ?? prefs.defaultDrop,
      frequency: input.frequency ?? prefs.frequency,
      watchStock: input.watchStock ?? true,
      watchIncreases: input.watchIncreases ?? false,
    };
    const tracked = new TrackedProduct(listing, options);
    await this.repository.add(
      userId,
      listing,
      options,
      tracked.initialStatus(),
    );
    return productDto(await this.requireProduct(userId, listing.id));
  }

  async update(
    userId: string,
    id: string,
    input: Partial<WatchOptions> & { status?: 'active' | 'paused' },
  ) {
    const listing = await this.requireProduct(userId, id);
    if (!listing.watch_id || !listing.options)
      throw new NotFoundError('Tracked product not found');
    const { status, ...optionsPatch } = input;
    const opts = { ...listing.options, ...optionsPatch };
    if (optionsPatch.targetPrice !== undefined)
      checkTarget(opts.targetPrice, listing.price);
    let next: Status | undefined = status;
    if (
      status !== 'paused' &&
      (status === 'active' || optionsPatch.targetPrice !== undefined) &&
      listing.watch_status !== 'paused'
    ) {
      next =
        listing.stock === 'out-of-stock'
          ? 'unavailable'
          : listing.price !== null && listing.price <= opts.targetPrice
            ? 'triggered'
            : 'active';
    }
    if (status === 'active') {
      await this.repository.bulk(userId, [id], 'resume');
    }
    if (!(await this.repository.change(userId, id, opts, next)))
      throw new NotFoundError('Tracked product not found');
    return productDto(await this.requireProduct(userId, id));
  }

  async requestCheck(userId: string, id: string) {
    const product = await this.requireProduct(userId, id);
    if (!product.watch_id) throw new NotFoundError('Tracked product not found');
    if (product.sample_owner_id) {
      throw new DomainError(
        'Sample products contain recorded example prices',
        409,
        'SAMPLE_PRODUCT',
      );
    }
    if (
      !this.scraper.enabled().includes(product.source) ||
      process.env.WORKERS_DISABLED === 'true'
    ) {
      throw new DomainError(
        'Monitoring is disabled for this source',
        409,
        'SOURCE_DISABLED',
      );
    }
    if (!(await this.repository.requestCheck(userId, id))) {
      throw new DomainError(
        'Resume monitoring before requesting a check',
        409,
        'WATCH_PAUSED',
      );
    }
    return { queued: true };
  }

  async offers(userId: string, id: string) {
    const current = await this.requireProduct(userId, id);
    const prefs = await this.auth.preferences(userId);
    const matches = prefs.matchDuplicates
      ? await this.repository.offers(userId, current)
      : [current];
    const offers = matches.map((row) => ({
      id: row.id,
      source: row.source,
      isSample: row.sample_owner_id != null,
      marketplace: MARKETPLACES[row.source].name,
      seller: row.details.seller,
      sellerRating: row.details.sellerRating,
      condition: row.details.condition,
      price: row.price,
      delivery: row.details.delivery,
      warranty: row.details.warranty,
      returns: row.details.returns,
      stock: stockLabels[row.stock],
      finalCost:
        row.price !== null && row.details.delivery !== null
          ? row.price + row.details.delivery
          : null,
      url: row.url,
      best: false,
      available: row.stock === 'in-stock',
    }));
    offers.sort(
      (a, b) =>
        (a.finalCost ?? Infinity) - (b.finalCost ?? Infinity) ||
        (a.price ?? Infinity) - (b.price ?? Infinity),
    );
    const best = offers.find(
      (o) => o.available && o.condition === 'New' && o.finalCost !== null,
    );
    if (best) best.best = true;
    const comparable = offers.filter(
      (o) =>
        o.available &&
        o.condition === current.details.condition &&
        o.finalCost !== null,
    );
    return {
      productId: id,
      offers,
      bestNew: best ?? null,
      lowestOverall:
        offers.find((o) => o.available && o.finalCost !== null) ?? null,
      priceSpread:
        comparable.length > 1
          ? comparable.at(-1)!.finalCost! - comparable[0].finalCost!
          : null,
    };
  }

  async dashboard(userId: string) {
    const [dashboard, alerts] = await Promise.all([
      this.repository.dashboard(userId),
      this.repository.alerts(userId, { page: 1, pageSize: 6 }),
    ]);
    const enabled =
      process.env.WORKERS_DISABLED === 'true' ? [] : this.scraper.enabled();
    const { tracked, recommended, sources, ...rest } = dashboard;
    const monitored = sources.filter((source) =>
      enabled.includes(source.source),
    );
    return {
      ...rest,
      sources: monitored,
      monitoringHealth: monitored.length
        ? Math.round(
            (100 * monitored.filter((source) => source.healthy).length) /
              monitored.length,
          )
        : null,
      tracked: tracked.map(productDto),
      recommended: recommended.map(productDto),
      recentAlerts: alerts.items.map(alertDto),
    };
  }

  async insights(userId: string, period: import('./ports').Period) {
    const { biggestDrops, marketplaceRows, ...result } =
      await this.repository.analytics(userId, period);
    return {
      ...result,
      marketplaceRows: marketplaceRows.map((row) => ({
        ...row,
        name: MARKETPLACES[row.source].name,
      })),
      biggestDrops: await Promise.all(
        biggestDrops.map(async (row) => ({
          product: productDto(row),
          events: (await this.repository.history(row.id, '30d')).events.slice(
            0,
            12,
          ),
        })),
      ),
    };
  }
}

export function alertDto(row: import('./ports').Alert) {
  return {
    id: row.id,
    productId: row.listing_id,
    source: row.source,
    marketplace: MARKETPLACES[row.source].name,
    type: row.type,
    title: row.title,
    message: row.message,
    oldPrice: row.old_price,
    newPrice: row.new_price,
    createdAt: row.created_at,
    read: row.read_at !== null,
  };
}

export function csvCell(value: unknown) {
  let text =
    typeof value === 'string'
      ? value
      : typeof value === 'number'
        ? String(value)
        : '';
  if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
