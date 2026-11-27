import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_PREFERENCES,
  evaluateAlerts,
  evaluateDeal,
  FREQUENCIES,
  matchKey,
} from '../../domain/monitoring';
import type {
  AlertType,
  Listing,
  Observation,
  Preferences,
  WatchOptions,
} from '../../domain/monitoring';
import type { Source } from '../../domain/marketplace';
import { MARKETPLACES } from '../../domain/marketplace';
import type {
  Lease,
  Mail,
  MonitorRepository,
  OutboxJob,
} from '../../application/ports';
import { Credentials } from '../security/credentials';
import { DATABASE, type Database, type Sql } from './drizzle/drizzle.service';

const listingFields = 'l.*,lower(l.source::text) as source';
const titles: Record<AlertType, string> = {
  target: 'Target price reached',
  'historic-low': 'New historical low',
  'back-in-stock': 'Back in stock',
  'better-offer': 'Better offer elsewhere',
  'price-drop': 'Price dropped',
  'price-increase': 'Price increased',
  unavailable: 'Product became unavailable',
};

type Subscriber = {
  id: string;
  user_id: string;
  listing_id: string;
  options: WatchOptions;
  email: string | null;
  email_verified_at: Date | null;
  preferences: Partial<Preferences>;
};

@Injectable()
export class PgMonitorRepository implements MonitorRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly secret: Credentials,
  ) {}

  async byUrl(url: string) {
    return (
      (
        await this.db.query<Listing>(
          'select ' +
            listingFields +
            ' from market_listings l where l.url=$1 or ' +
            'l.id=(select listing_id from market_listing_aliases where url=$1) order by (l.url=$1) desc limit 1',
          [url],
        )
      )[0] ?? null
    );
  }

  savePreview(
    source: Source,
    url: string,
    observation: Observation,
    alias?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const rows = await tx.query<Listing>(
        'insert into market_listings as l(source,url,details,price,first_price,low_price,advertised_price,stock,match_key,last_checked_at,scheduled_at,unavailable_since) ' +
          "values($1,$2,$3,$4,$4,$4,$5,$6::listing_stock,$7,now(),now()+interval '1 hour',case when $6::listing_stock='out-of-stock' then now() end) on conflict(url) do nothing returning " +
          listingFields,
        [
          source.toUpperCase(),
          url,
          JSON.stringify(observation.details),
          observation.price,
          observation.advertisedPrice,
          observation.stock,
          matchKey(observation.details),
        ],
      );
      if (rows.length) {
        await tx.query(
          'insert into price_observations(listing_id,price,stock) values($1,$2,$3)',
          [rows[0].id, observation.price, observation.stock],
        );
      }
      const existing =
        rows[0] ??
        (
          await tx.query<Listing>(
            'select ' + listingFields + ' from market_listings l where url=$1',
            [url],
          )
        )[0];
      if (alias && alias !== url)
        await tx.query(
          'insert into market_listing_aliases(url,listing_id) values($1,$2) on conflict(url) do nothing',
          [alias, existing.id],
        );
      return existing;
    });
  }

  async lease(sources: Source[], limit: number) {
    if (!sources.length || limit <= 0) return [];
    const rows = await this.db.query<
      Listing & {
        lease_token: string;
        failures: number;
        last_error: string | null;
      }
    >(
      'with due as (select l.id from market_listings l where l.source=any($1::text[]::source[]) ' +
        'and l.sample_owner_id is null and l.scheduled_at<=now() and (l.lease_until is null or l.lease_until<now()) ' +
        "and exists(select 1 from tracked_products t where t.listing_id=l.id and t.status<>'PAUSED') " +
        'order by l.scheduled_at,l.id limit $2 for update of l skip locked) ' +
        "update market_listings l set lease_token=gen_random_uuid(),lease_until=now()+interval '180 seconds' from due where l.id=due.id returning " +
        listingFields,
      [sources.map((s) => s.toUpperCase()), limit],
    );
    return rows.map((listing) => ({
      id: listing.id,
      source: listing.source,
      url: listing.url,
      leaseToken: listing.lease_token,
      failures: listing.failures,
      lastError: listing.last_error,
      listing,
    }));
  }

  async complete(lease: Lease, next: Observation) {
    await this.db.transaction(async (tx) => {
      const [previous] = await tx.query<Listing>(
        'select ' +
          listingFields +
          ' from market_listings l where l.id=$1 and l.lease_token=$2 and l.lease_until>=now() for update',
        [lease.id, lease.leaseToken],
      );
      if (!previous) return;
      const [reference] = await tx.query<{ price: number | null }>(
        'select round(percentile_cont(0.5) within group(order by price))::int as price from price_observations ' +
          "where listing_id=$1 and checked_at>=now()-interval '90 days' and stock<>'out-of-stock'",
        [lease.id],
      );
      const deal = evaluateDeal(next, previous.low_price, reference.price);
      const priorPrice =
        next.price !== null && next.price !== previous.price
          ? previous.price
          : previous.previous_price;
      const [event] = await tx.query<{ id: string }>(
        'insert into price_observations(listing_id,price,previous_price,stock) values($1,$2,$3,$4) returning id',
        [lease.id, next.price, previous.price, next.stock],
      );
      const subscribers = await tx.query<Subscriber>(
        'select t.id,t.user_id,t.listing_id,t.options,u.email,u.email_verified_at,u.preferences from tracked_products t ' +
          "join users u on u.id=t.user_id where t.listing_id=$1 and t.status<>'PAUSED' for update of t",
        [lease.id],
      );
      let frequency: number = FREQUENCIES['24h'];
      const unavailableSince =
        next.stock === 'out-of-stock'
          ? (previous.unavailable_since ?? new Date())
          : null;
      for (const subscriber of subscribers) {
        const prefs = { ...DEFAULT_PREFERENCES, ...subscriber.preferences };
        const opts = subscriber.options;
        if (!opts) continue;
        frequency = Math.min(
          frequency,
          FREQUENCIES[opts.frequency] ?? FREQUENCIES['6h'],
        );
        const events = evaluateAlerts(previous, next, opts, prefs);
        const met =
          next.stock !== 'out-of-stock' &&
          next.price !== null &&
          next.price <= opts.targetPrice;
        const longUnavailable =
          unavailableSince &&
          Date.now() - new Date(unavailableSince).getTime() >= 30 * 86400000;
        const status =
          next.stock === 'out-of-stock'
            ? longUnavailable && prefs.autoPause
              ? 'PAUSED'
              : 'UNAVAILABLE'
            : met
              ? 'TRIGGERED'
              : 'ACTIVE';
        await tx.query(
          'update tracked_products set status=$2,current_price=coalesce($3,current_price),"updatedAt"=now() where id=$1',
          [subscriber.id, status, next.price],
        );
        for (const type of events) {
          await this.notify(
            tx,
            subscriber,
            previous,
            type,
            event.id + ':' + type,
            previous.price,
            next.price,
            next.details.title,
          );
        }
      }
      const match = matchKey(next.details);
      await tx.query(
        'update market_listings set details=$3,price=coalesce($4,price),previous_price=$5,first_price=coalesce(first_price,$4),' +
          'low_price=case when $4::int is null then low_price else least(low_price,$4) end,advertised_price=$6,stock=$7,' +
          'score=$8,verdict=$9,match_key=$10,last_checked_at=now(),scheduled_at=now()+make_interval(mins=>$11),' +
          'lease_token=null,lease_until=null,failures=0,last_error=null,unavailable_since=$12 where id=$1 and lease_token=$2',
        [
          lease.id,
          lease.leaseToken,
          JSON.stringify(next.details),
          next.price,
          priorPrice,
          next.advertisedPrice,
          next.stock,
          deal.score,
          deal.verdict,
          match,
          frequency,
          unavailableSince,
        ],
      );
      if (
        match &&
        next.price !== null &&
        next.stock === 'in-stock' &&
        next.details.delivery !== null &&
        (previous.price !== next.price ||
          previous.stock !== next.stock ||
          previous.details.delivery !== next.details.delivery)
      ) {
        await this.compare(tx, previous, next, match, event.id);
      }
    });
  }

  private async compare(
    tx: Sql,
    current: Listing,
    next: Observation,
    match: string,
    eventId: string,
  ) {
    if (next.details.delivery === null) return;
    const final = (next.price ?? 0) + next.details.delivery;
    const others = await tx.query<
      Subscriber & { price: number; title: string }
    >(
      "select t.id,t.listing_id,t.user_id,t.options,u.email,u.email_verified_at,u.preferences,l.price,l.details->>'title' as title " +
        'from market_listings l join tracked_products t on t.listing_id=l.id join users u on u.id=t.user_id ' +
        "where l.id<>$1 and l.match_key=$2 and l.source<>$3 and l.stock='in-stock' and t.status<>'PAUSED' " +
        "and l.details->>'condition'=$4 and l.price+((l.details->>'delivery')::int)>=$5/0.97 " +
        'order by t.id limit 500',
      [
        current.id,
        match,
        current.source.toUpperCase(),
        next.details.condition,
        final,
      ],
    );
    for (const subscriber of others) {
      const prefs = { ...DEFAULT_PREFERENCES, ...subscriber.preferences };
      if (!prefs.matchDuplicates || !prefs.drop) continue;
      await this.notify(
        tx,
        subscriber,
        current,
        'better-offer',
        eventId + ':better:' + subscriber.listing_id,
        subscriber.price,
        next.price,
        next.details.title,
      );
    }
  }

  private async notify(
    tx: Sql,
    subscriber: Subscriber,
    listing: Listing,
    type: AlertType,
    eventKey: string,
    oldPrice: number | null,
    newPrice: number | null,
    productName: string,
  ) {
    const prefs = { ...DEFAULT_PREFERENCES, ...subscriber.preferences };
    const title = titles[type];
    const message =
      productName +
      ' · ' +
      MARKETPLACES[listing.source].name +
      (newPrice === null
        ? ''
        : ' · ' + new Intl.NumberFormat('en').format(newPrice) + ' UZS');
    const key = subscriber.id + ':' + eventKey;
    if (prefs.inApp) {
      await tx.query(
        'insert into alerts(user_id,watch_id,listing_id,event_key,source,type,title,message,old_price,new_price) ' +
          'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(user_id,event_key) do nothing',
        [
          subscriber.user_id,
          subscriber.id,
          subscriber.listing_id,
          key,
          listing.source.toUpperCase(),
          type,
          title,
          message,
          oldPrice,
          newPrice,
        ],
      );
    }
    if (prefs.emailAlerts && subscriber.email && subscriber.email_verified_at) {
      await this.mail(tx, subscriber.user_id, 'alert:' + key, {
        to: subscriber.email,
        subject: title,
        text: message,
      });
    }
  }

  private async mail(tx: Sql, userId: string, key: string, mail: Mail) {
    await tx.query(
      'insert into email_outbox(user_id,event_key,payload) values($1,$2,$3) on conflict(event_key) do nothing',
      [userId, key, this.secret.seal(mail)],
    );
  }

  async fail(lease: Lease, code: string, retryMs: number) {
    await this.db.query(
      'update market_listings set lease_until=null,lease_token=null,failures=failures+1,last_error=$3,' +
        'scheduled_at=now()+make_interval(secs=>$4) where id=$1 and lease_token=$2',
      [
        lease.id,
        lease.leaseToken,
        code.slice(0, 64),
        Math.ceil(retryMs / 1000),
      ],
    );
  }

  async reserve(source: Source, spacingMs: number) {
    const rows = await this.db.query(
      'insert into source_budgets(source,next_request_at) values($1,now()+make_interval(secs=>$2)) ' +
        'on conflict(source) do update set next_request_at=excluded.next_request_at where source_budgets.next_request_at<=now() returning source',
      [source.toUpperCase(), spacingMs / 1000],
    );
    return rows.length > 0;
  }

  async cooldown(source: Source, milliseconds: number) {
    await this.db.query(
      'insert into source_budgets(source,next_request_at) values($1,now()+make_interval(secs=>$2)) ' +
        'on conflict(source) do update set next_request_at=greatest(source_budgets.next_request_at,excluded.next_request_at)',
      [source.toUpperCase(), milliseconds / 1000],
    );
  }

  async outbox(limit: number) {
    const rows = await this.db.query<{
      id: string;
      token: string;
      attempts: number;
      payload: string;
      event_key: string;
    }>(
      'with due as (select id from email_outbox where scheduled_at<=now() and delivered_at is null and failed_at is null ' +
        'and (expires_at is null or expires_at>now()) and (lease_until is null or lease_until<now()) ' +
        'order by scheduled_at,id limit $1 for update skip locked) ' +
        "update email_outbox o set lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds',attempts=attempts+1 " +
        'from due where o.id=due.id returning o.id,o.lease_token as token,o.attempts,o.payload,o.event_key',
      [limit],
    );
    const jobs: OutboxJob[] = [];
    for (const row of rows) {
      try {
        jobs.push({
          ...this.secret.open<Mail>(row.payload),
          id: row.id,
          token: row.token,
          attempts: row.attempts,
          key: row.event_key,
        });
      } catch {
        await this.db.query(
          "update email_outbox set failed_at=now(),lease_token=null,lease_until=null,payload='' where id=$1 and lease_token=$2",
          [row.id, row.token],
        );
      }
    }
    return jobs;
  }

  async finishMail(job: OutboxJob, delivered: boolean) {
    await this.db.query(
      'update email_outbox set delivered_at=case when $3 then now() else delivered_at end,' +
        'failed_at=case when not $3 and attempts>=6 then now() else failed_at end,' +
        "payload=case when $3 or attempts>=6 then '' else payload end,lease_token=null,lease_until=null," +
        'scheduled_at=now()+make_interval(secs=>$4) where id=$1 and lease_token=$2',
      [
        job.id,
        job.token,
        delivered,
        Math.min(3600, 30 * 2 ** Math.min(10, job.attempts)),
      ],
    );
  }

  async queueDigests(week: string) {
    const recipients = await this.db.query<{
      id: string;
      email: string;
      count: number;
      unread: number;
    }>(
      'select u.id,u.email,count(*)::int as count,count(*) filter(where a.read_at is null)::int as unread from users u ' +
        "join alerts a on a.user_id=u.id and a.created_at>= $1::date - interval '7 days' and a.created_at<$1::date " +
        "where u.email_verified_at is not null and coalesce((u.preferences->>'digest')::boolean,true) " +
        "and coalesce((u.preferences->>'emailAlerts')::boolean,true) and u.email is not null " +
        "and not exists(select 1 from email_outbox o where o.user_id=u.id and o.event_key='digest:'||u.id::text||':'||$1) " +
        'group by u.id order by u.id limit 500',
      [week],
    );
    for (const user of recipients)
      await this.mail(this.db, user.id, 'digest:' + user.id + ':' + week, {
        to: user.email,
        subject: 'Deal Alert weekly digest',
        text:
          'Last week: ' + user.count + ' alerts, ' + user.unread + ' unread.',
      });
  }

  async prune() {
    await this.db.query('delete from request_throttles where expires_at<now()');
    await this.db.query('delete from auth_sessions where expires_at<now()');
    await this.db.query('delete from auth_challenges where expires_at<now()');
    await this.db.query(
      'delete from telegram_link_challenges where expires_at<now()',
    );
    await this.db.query(
      "delete from telegram_updates where received_at<now()-interval '7 days'",
    );
    await this.db.query(
      "update email_outbox set payload='',failed_at=now() where expires_at<now() and delivered_at is null and failed_at is null",
    );
    await this.db.query(
      "delete from email_outbox where created_at<now()-interval '90 days' and (failed_at is not null or delivered_at is not null)",
    );
  }
}
