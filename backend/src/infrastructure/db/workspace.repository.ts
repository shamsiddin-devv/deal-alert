import { Inject, Injectable } from '@nestjs/common';
import type {
  Alert,
  DashboardRead,
  HistoryRead,
  InsightsRead,
  WorkspaceEvent,
  Collection,
  ListQuery,
  Page,
  Period,
  ProductView,
  WorkspaceRepository,
} from '../../application/ports';
import type {
  AlertType,
  Listing,
  Range,
  Status,
  WatchOptions,
} from '../../domain/monitoring';
import { RANGES } from '../../domain/monitoring';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { ConflictError } from '../../domain/errors/ConflictError';
import { DATABASE, type Database } from './drizzle/drizzle.service';

const visibleListing =
  "((l.sample_owner_id is null and l.url not like 'https://deal-alert-demo.invalid/%') or l.sample_owner_id=$1)";
const watchStatus = 'lower(t.status::text)';
const delta =
  'coalesce(round((l.price-l.previous_price)*100.0/nullif(l.previous_price,0),1),0)';
const savings = 'greatest(0,l.previous_price-l.price)';
const productFields =
  'l.*,lower(l.source::text) as source,t.id as watch_id,' +
  watchStatus +
  ' as watch_status,t.options,array(select c.name from collections c join collection_items i on i.collection_id=c.id ' +
  'where i.watch_id=t.id and c.user_id=$1 order by c.name) as labels';
const productBase =
  ' from market_listings l left join tracked_products t on t.listing_id=l.id and t.user_id=$1';
const sortSql: Record<string, string> = {
  score: 'l.score desc,l.last_checked_at desc nulls last',
  discount: delta + ' asc,l.price asc nulls last',
  change: delta + ' asc,l.price asc nulls last',
  'price-asc': 'l.price asc nulls last',
  price: 'l.price asc nulls last',
  recent: 'l.last_checked_at desc nulls last',
  name: "lower(l.details->>'title') asc nulls last",
};

function pageOf<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

class Conditions {
  readonly values: unknown[];
  readonly clauses: string[] = [];
  constructor(...values: unknown[]) {
    this.values = values;
  }
  bind(value: unknown) {
    return '$' + this.values.push(value);
  }
  add(expression: string) {
    this.clauses.push(expression);
  }
  sql() {
    return this.clauses.length ? ' where ' + this.clauses.join(' and ') : '';
  }
}

@Injectable()
export class PgWorkspaceRepository implements WorkspaceRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async product(userId: string, id: string) {
    const [row] = await this.db.query<ProductView>(
      'select ' +
        productFields +
        productBase +
        ' where l.id=$2 and (l.last_checked_at is not null or t.id is not null) and ' +
        visibleListing,
      [userId, id],
    );
    return row ?? null;
  }

  async list(userId: string, query: ListQuery, tracked: boolean) {
    const where = new Conditions(userId);
    where.add(visibleListing);
    where.add(tracked ? 't.id is not null' : 'l.last_checked_at is not null');
    if (query.query)
      where.add(
        "strpos(lower(concat_ws(' ',l.details->>'title',l.details->>'brand',l.details->>'model',l.details->>'category',l.details->>'seller',l.source::text)),lower(" +
          where.bind(query.query) +
          '))>0',
      );
    if (query.marketplaces?.length)
      where.add(
        'l.source=any(' +
          where.bind(query.marketplaces.map((s) => s.toUpperCase())) +
          '::text[]::source[])',
      );
    for (const key of ['brand', 'category', 'condition'] as const) {
      if (query[key] && query[key] !== 'all')
        where.add("l.details->>'" + key + "'=" + where.bind(query[key]));
    }
    if (query.min !== undefined) where.add('l.price>=' + where.bind(query.min));
    if (query.max !== undefined) where.add('l.price<=' + where.bind(query.max));
    if (query.minDiscount !== undefined)
      where.add(delta + '<=' + where.bind(-query.minDiscount));
    if (query.inStock) where.add("l.stock='in-stock'");
    if (query.histLow) where.add('l.price<=l.low_price*1.02');
    if (query.dropOnly) where.add('l.price<l.previous_price');
    if (query.status) where.add(watchStatus + '=' + where.bind(query.status));
    const params = [...where.values];
    const order =
      sortSql[query.sort ?? (tracked ? 'recent' : 'score')] ?? sortSql.score;
    const base = productBase + where.sql();
    const [items, [counts]] = await Promise.all([
      this.db.query<ProductView>(
        'select ' +
          productFields +
          base +
          ' order by ' +
          order +
          ',l.id limit ' +
          where.bind(query.pageSize) +
          ' offset ' +
          where.bind((query.page - 1) * query.pageSize),
        where.values,
      ),
      this.db.query<{ total: number; average: number }>(
        'select count(*)::int as total,coalesce(round(avg(' +
          savings +
          ')),0)::int as average' +
          base,
        params,
      ),
    ]);
    return {
      ...pageOf(items, counts.total, query.page, query.pageSize),
      averageSaving: counts.average,
    };
  }

  async facets(userId: string) {
    const [row] = await this.db.query<{
      brands: string[];
      categories: string[];
    }>(
      "select coalesce(array_agg(distinct details->>'brand' order by details->>'brand') filter(where details->>'brand' is not null),'{}') as brands," +
        "coalesce(array_agg(distinct details->>'category' order by details->>'category') filter(where details->>'category' is not null),'{}') as categories " +
        'from market_listings l where last_checked_at is not null and ' +
        visibleListing,
      [userId],
    );
    return row;
  }

  async add(
    userId: string,
    listing: Listing,
    options: WatchOptions,
    status: Status,
  ) {
    await this.db.transaction(async (tx) => {
      await tx.query(
        'insert into tracked_products(user_id,listing_id,product_url,product_name,source,target_price,current_price,status,options) ' +
          'values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(user_id,listing_id) do nothing',
        [
          userId,
          listing.id,
          listing.url,
          listing.details.title.slice(0, 500),
          listing.source.toUpperCase(),
          options.targetPrice,
          listing.price,
          status.toUpperCase(),
          JSON.stringify(options),
        ],
      );
      await tx.query(
        'update market_listings set scheduled_at=least(scheduled_at,now()) where id=$1 and last_checked_at is null',
        [listing.id],
      );
    });
  }

  async change(
    userId: string,
    id: string,
    options?: WatchOptions,
    status?: Status,
  ) {
    const changed = await this.db.query(
      'update tracked_products set options=coalesce($3,options),target_price=coalesce($4,target_price),status=coalesce($5,status),"updatedAt"=now() ' +
        'where user_id=$1 and listing_id=$2 returning id',
      [
        userId,
        id,
        options ? JSON.stringify(options) : null,
        options?.targetPrice ?? null,
        status?.toUpperCase() ?? null,
      ],
    );
    return changed.length === 1;
  }

  bulk(userId: string, ids: string[], action: 'pause' | 'resume' | 'remove') {
    return this.db.transaction(async (tx) => {
      const owned = await tx.query(
        'select id from tracked_products where user_id=$1 and listing_id=any($2::uuid[]) for update',
        [userId, ids],
      );
      if (owned.length !== ids.length)
        throw new NotFoundError('One or more tracked products were not found');
      if (action === 'remove') {
        await tx.query(
          'delete from tracked_products where user_id=$1 and listing_id=any($2::uuid[])',
          [userId, ids],
        );
      } else {
        await tx.query(
          'update tracked_products set status=$3,"updatedAt"=now() where user_id=$1 and listing_id=any($2::uuid[])',
          [userId, ids, action === 'pause' ? 'PAUSED' : 'ACTIVE'],
        );
        if (action === 'resume')
          await tx.query(
            'update market_listings set scheduled_at=least(scheduled_at,now()) where id=any($1::uuid[])',
            [ids],
          );
      }
    });
  }

  async history(id: string, range: Range): Promise<HistoryRead> {
    const days = RANGES[range];
    const filter =
      ' from price_observations where listing_id=$1 and price is not null ' +
      'and ($2::integer is null or checked_at>=now()-make_interval(days=>$2))';
    const [points, [stats], events] = await Promise.all([
      this.db.query<HistoryRead['points'][number]>(
        "select to_char(checked_at at time zone 'Asia/Tashkent','YYYY-MM-DD') as date,(extract(epoch from checked_at)*1000)::float8 as ts,price from (" +
          "select distinct on ((checked_at at time zone 'Asia/Tashkent')::date) checked_at,price" +
          filter +
          " order by (checked_at at time zone 'Asia/Tashkent')::date desc,checked_at desc limit 2400) p order by checked_at",
        [id, days],
      ),
      this.db.query<HistoryRead['stats']>(
        'select min(price) as min,max(price) as max,round(avg(price))::int as avg,' +
          'round(percentile_cont(0.5) within group(order by price))::int as median,' +
          'count(*) filter(where previous_price<>price)::int as changes,count(*)::int as samples' +
          filter,
        [id, days],
      ),
      this.db.query<HistoryRead['events'][number]>(
        'select to_char(checked_at at time zone \'Asia/Tashkent\',\'YYYY-MM-DD\') as date,previous_price as "from",price as "to",' +
          '(price-previous_price) as change,((price-previous_price)*100.0/previous_price)::float8 as pct' +
          filter +
          ' and previous_price<>price order by checked_at desc limit 30',
        [id, days],
      ),
    ]);
    return { range, points, stats, events };
  }

  async events(
    userId: string,
    range: Range,
    query: ListQuery,
  ): Promise<Page<WorkspaceEvent>> {
    const conditions = new Conditions(userId, RANGES[range]);
    conditions.add('o.price<>o.previous_price');
    conditions.add(
      '($2::int is null or o.checked_at>=now()-make_interval(days=>$2))',
    );
    if (query.marketplaces?.length)
      conditions.add(
        'l.source=any(' +
          conditions.bind(query.marketplaces.map((s) => s.toUpperCase())) +
          '::text[]::source[])',
      );
    if (query.query)
      conditions.add(
        "strpos(lower(concat_ws(' ',l.details->>'title',l.details->>'brand',l.source::text)),lower(" +
          conditions.bind(query.query) +
          '))>0',
      );
    const base =
      ' from price_observations o join market_listings l on l.id=o.listing_id ' +
      'join tracked_products t on t.listing_id=l.id and t.user_id=$1' +
      conditions.sql();
    const params = [...conditions.values];
    const [items, [count]] = await Promise.all([
      this.db.query<WorkspaceEvent>(
        'select o.id,l.id as "productId",l.details->>\'title\' as title,lower(l.source::text) as source,' +
          "to_char(o.checked_at at time zone 'Asia/Tashkent','YYYY-MM-DD') as date,o.checked_at as \"checkedAt\"," +
          'o.previous_price as "from",o.price as "to",o.price-o.previous_price as change,' +
          '((o.price-o.previous_price)*100.0/o.previous_price)::float8 as pct' +
          base +
          ' order by o.checked_at desc,o.id limit ' +
          conditions.bind(query.pageSize) +
          ' offset ' +
          conditions.bind((query.page - 1) * query.pageSize),
        conditions.values,
      ),
      this.db.query<{ total: number }>(
        'select count(*)::int as total' + base,
        params,
      ),
    ]);
    return pageOf(items, count.total, query.page, query.pageSize);
  }

  async requestCheck(userId: string, id: string) {
    const rows = await this.db.query(
      "update market_listings l set scheduled_at=least(l.scheduled_at,now()) where l.id=$2 and l.sample_owner_id is null and exists(select 1 from tracked_products t where t.listing_id=l.id and t.user_id=$1 and t.status<>'PAUSED') returning l.id",
      [userId, id],
    );
    return rows.length === 1;
  }

  offers(userId: string, product: Listing) {
    return this.db.query<Listing>(
      'select l.*,lower(l.source::text) as source from market_listings l ' +
        'where ' +
        visibleListing +
        ' and (l.id=$2 or ($3::text is not null and l.match_key=$3 and l.price is not null)) ' +
        'order by l.price asc nulls last,l.id limit 100',
      [userId, product.id, product.match_key],
    );
  }

  collections(userId: string) {
    return this.db.query<Collection>(
      'select c.id,c.name,c.description,array(select t.listing_id from collection_items i join tracked_products t on t.id=i.watch_id ' +
        'where i.collection_id=c.id and t.user_id=c.user_id and t.listing_id is not null order by t.listing_id) as "productIds" ' +
        'from collections c where c.user_id=$1 order by c.created_at,c.id',
      [userId],
    );
  }

  async createCollection(userId: string, name: string, description: string) {
    const [row] = await this.db.query<Collection>(
      'insert into collections(user_id,name,description) values($1,$2,$3) returning id,name,description,\'{}\'::uuid[] as "productIds"',
      [userId, name, description],
    );
    return row;
  }

  async editCollection(
    userId: string,
    id: string,
    patch: { name?: string; description?: string },
  ) {
    return (
      (
        await this.db.query(
          'update collections set name=coalesce($3,name),description=coalesce($4,description) where user_id=$1 and id=$2 returning id',
          [userId, id, patch.name ?? null, patch.description ?? null],
        )
      ).length === 1
    );
  }

  async removeCollection(userId: string, id: string) {
    return (
      (
        await this.db.query(
          'delete from collections where user_id=$1 and id=$2 returning id',
          [userId, id],
        )
      ).length === 1
    );
  }

  collectionItem(userId: string, id: string, listingId: string, add: boolean) {
    return this.db.transaction(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        'select t.id from tracked_products t join collections c on c.user_id=t.user_id ' +
          'where c.id=$2 and t.user_id=$1 and t.listing_id=$3 for key share of t,c',
        [userId, id, listingId],
      );
      if (!rows.length) return false;
      await tx.query(
        add
          ? 'insert into collection_items(collection_id,watch_id) values($1,$2) on conflict do nothing'
          : 'delete from collection_items where collection_id=$1 and watch_id=$2',
        [id, rows[0].id],
      );
      return true;
    });
  }

  async alerts(
    userId: string,
    filters: {
      types?: AlertType[];
      unread?: boolean;
      page: number;
      pageSize: number;
    },
  ) {
    const f = new Conditions(userId);
    f.add('user_id=$1');
    if (filters.types?.length)
      f.add('type=any(' + f.bind(filters.types) + '::text[])');
    if (filters.unread !== undefined)
      f.add(filters.unread ? 'read_at is null' : 'read_at is not null');
    const params = [...f.values];
    const [items, [count], groups] = await Promise.all([
      this.db.query<Alert>(
        'select id,listing_id,lower(source::text) as source,type,title,message,old_price,new_price,created_at,read_at from alerts' +
          f.sql() +
          ' order by created_at desc,id limit ' +
          f.bind(filters.pageSize) +
          ' offset ' +
          f.bind((filters.page - 1) * filters.pageSize),
        f.values,
      ),
      this.db.query<{ total: number }>(
        'select count(*)::int as total from alerts' + f.sql(),
        params,
      ),
      this.db.query<{ type: string; total: number; unread: number }>(
        'select type,count(*)::int as total,count(*) filter(where read_at is null)::int as unread from alerts where user_id=$1 group by type',
        [userId],
      ),
    ]);
    return {
      ...pageOf(items, count.total, filters.page, filters.pageSize),
      unread: groups.reduce((sum, g) => sum + g.unread, 0),
      counts: Object.fromEntries(groups.map((g) => [g.type, g.total])),
    };
  }

  async alertRead(userId: string, id: string | null, read: boolean) {
    const rows = await this.db.query(
      'update alerts set read_at=case when $3 then coalesce(read_at,now()) else null end where user_id=$1 and ($2::uuid is null or id=$2) returning id',
      [userId, id, read],
    );
    return id === null || rows.length === 1;
  }

  async removeAlert(userId: string, id: string) {
    return (
      (
        await this.db.query(
          'delete from alerts where user_id=$1 and id=$2 returning id',
          [userId, id],
        )
      ).length === 1
    );
  }

  async dashboard(userId: string): Promise<DashboardRead> {
    const [
      [metrics],
      [{ unread }],
      sources,
      tracked,
      recommended,
      recentEvents,
    ] = await Promise.all([
      this.db.query<DashboardRead['metrics']>(
        "select count(*)::int as tracked,count(*) filter(where t.status in ('ACTIVE','TRIGGERED'))::int as active," +
          'count(*) filter(where l.price<l.previous_price)::int as "priceDrops",' +
          'coalesce(sum(' +
          savings +
          '),0)::float8 as "potentialSavings" from tracked_products t ' +
          'join market_listings l on l.id=t.listing_id where t.user_id=$1',
        [userId],
      ),
      this.db.query<{ unread: number }>(
        'select count(*)::int as unread from alerts where user_id=$1 and read_at is null',
        [userId],
      ),
      this.db.query<DashboardRead['sources'][number]>(
        'select lower(l.source::text) as source,bool_and(l.last_error is null and l.last_checked_at is not null) as healthy ' +
          "from market_listings l join tracked_products t on t.listing_id=l.id where t.user_id=$1 and l.sample_owner_id is null and t.status<>'PAUSED' group by l.source",
        [userId],
      ),
      this.list(userId, { page: 1, pageSize: 6, sort: 'recent' }, true),
      this.list(
        userId,
        { page: 1, pageSize: 6, sort: 'score', dropOnly: true },
        false,
      ),
      this.events(userId, '30d', { page: 1, pageSize: 8 }),
    ]);
    return {
      metrics,
      unread,
      sources,
      tracked: tracked.items,
      recommended: recommended.items,
      recentEvents,
      monitoringHealth: sources.length
        ? Math.round(
            (100 * sources.filter((s) => s.healthy).length) / sources.length,
          )
        : null,
    };
  }

  async analytics(userId: string, period: Period): Promise<InsightsRead> {
    const periods = {
      daily: ['day', 7],
      weekly: ['week', 8],
      monthly: ['month', 6],
      yearly: ['year', 3],
    } as const;
    const [unit, count] = periods[period];
    const [
      [summary],
      [{ confirmed }],
      marketplaceRows,
      savingsByProduct,
      trend,
      drops,
    ] = await Promise.all([
      this.db.query<InsightsRead['summary']>(
        'select coalesce(sum(' +
          savings +
          '),0)::float8 as "potentialSavings",' +
          'count(*) filter(where l.price<=t.target_price)::int as "atTarget",' +
          'coalesce(avg(greatest(0,-' +
          delta +
          ')),0)::float8 as "averageDiscount",' +
          'count(*) filter(where l.score>=75)::int as opportunities from tracked_products t join market_listings l on l.id=t.listing_id where t.user_id=$1',
        [userId],
      ),
      this.db.query<{ confirmed: number }>(
        'select coalesce(sum(greatest(0,reference_price-paid)),0)::float8 as confirmed from purchases where user_id=$1',
        [userId],
      ),
      this.db.query<InsightsRead['marketplaceRows'][number]>(
        'select lower(source::text) as source,count(*)::int as offers,round(avg(price))::float8 as avg,' +
          'count(*) filter(where score>=75)::int as best from market_listings l where last_checked_at is not null and ' +
          visibleListing +
          ' group by source order by source',
        [userId],
      ),
      this.db.query<InsightsRead['savingsByProduct'][number]>(
        "select l.id,coalesce(l.details->>'brand',l.details->>'title') as label," +
          savings +
          ' as value ' +
          'from tracked_products t join market_listings l on l.id=t.listing_id where t.user_id=$1 order by value desc,l.id limit 6',
        [userId],
      ),
      this.db.query<InsightsRead['trend'][number]>(
        "select to_char(date_trunc($2,o.checked_at at time zone 'Asia/Tashkent'),'YYYY-MM-DD') as label," +
          'sum(greatest(0,o.previous_price-o.price))::float8 as value from price_observations o ' +
          'join tracked_products t on t.listing_id=o.listing_id and t.user_id=$1 ' +
          'where o.price<o.previous_price group by label order by label desc limit $3',
        [userId, unit, count],
      ),
      this.list(
        userId,
        { page: 1, pageSize: 4, sort: 'change', dropOnly: true },
        true,
      ),
    ]);
    return {
      summary,
      confirmedSavings: confirmed,
      marketplaceRows,
      savingsByProduct,
      trend: trend.reverse(),
      biggestDrops: drops.items,
    };
  }

  async purchase(userId: string, listing: Listing, paid: number, key: string) {
    const rows = await this.db.query<{ id: string }>(
      'insert into purchases(user_id,listing_id,paid,reference_price,request_key) values($1,$2,$3,$4,$5) ' +
        'on conflict(user_id,request_key) do update set request_key=excluded.request_key ' +
        'where purchases.listing_id=excluded.listing_id and purchases.paid=excluded.paid returning id',
      [userId, listing.id, paid, listing.previous_price, key],
    );
    if (!rows.length)
      throw new ConflictError(
        'Idempotency key was already used for a different purchase',
      );
    return rows[0];
  }

  async support(userId: string, subject: string, message: string) {
    const [row] = await this.db.query<{ id: string }>(
      'insert into support_requests(user_id,subject,message) values($1,$2,$3) returning id',
      [userId, subject, message],
    );
    return row;
  }

  async export(userId: string) {
    const [products, collections, alerts, purchases, support] =
      await Promise.all([
        this.db.query<ProductView>(
          'select ' +
            productFields +
            productBase +
            ' where t.id is not null order by l.id',
          [userId],
        ),
        this.collections(userId),
        this.db.query(
          'select id,listing_id,type,title,message,old_price,new_price,created_at,read_at from alerts where user_id=$1',
          [userId],
        ),
        this.db.query(
          'select id,listing_id,paid,reference_price,created_at from purchases where user_id=$1',
          [userId],
        ),
        this.db.query(
          'select id,subject,message,created_at from support_requests where user_id=$1',
          [userId],
        ),
      ]);
    return { products, collections, alerts, purchases, support };
  }
}
