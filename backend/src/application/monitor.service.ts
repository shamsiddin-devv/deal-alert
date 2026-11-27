import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import {
  EMAIL,
  MONITOR,
  SCRAPER,
  type MailGateway,
  type MarketplaceGateway,
  type MonitorRepository,
} from './ports';
import { ScrapeError } from '../domain/errors/ScrapeError';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private monitoring = false;
  private sending = false;

  constructor(
    @Inject(MONITOR) private readonly repository: MonitorRepository,
    @Inject(SCRAPER) private readonly gateway: MarketplaceGateway,
    @Inject(EMAIL) private readonly mail: MailGateway,
  ) {}

  @Interval(15000)
  async tick() {
    if (this.monitoring || process.env.WORKERS_DISABLED === 'true') return;
    const enabled = this.gateway.enabled();
    if (!enabled.length) return;
    this.monitoring = true;
    try {
      await Promise.allSettled(
        enabled.map(async (source) => {
          for (const job of await this.repository.lease([source], 1)) {
            try {
              const observation = await this.gateway.read(
                job.source,
                new URL(job.url),
              );
              await this.repository.complete(job, observation);
            } catch (error) {
              const code =
                error instanceof ScrapeError ? error.code : 'MONITOR_FAILURE';
              if (
                code === 'LISTING_NOT_FOUND' &&
                job.lastError === code &&
                job.listing.last_checked_at
              ) {
                await this.repository.complete(job, {
                  price: null,
                  advertisedPrice: null,
                  stock: 'out-of-stock',
                  details: job.listing.details,
                });
                continue;
              }
              const backoff = Math.min(
                86400000,
                60000 * 2 ** Math.min(10, job.failures),
              );
              const retry =
                (error instanceof ScrapeError ? error.retryMs : undefined) ??
                backoff;
              await this.repository.fail(
                job,
                code,
                retry + Math.round(Math.random() * 10000),
              );
              this.logger.warn({ source: job.source, listingId: job.id, code });
            }
          }
        }),
      ).then((results) => {
        if (results.some((result) => result.status === 'rejected'))
          this.logger.error('A monitoring worker database operation failed');
      });
    } catch {
      this.logger.error('Monitoring tick failed');
    } finally {
      this.monitoring = false;
    }
  }

  @Interval(5000)
  async deliver() {
    if (
      this.sending ||
      process.env.WORKERS_DISABLED === 'true' ||
      !this.mail.available()
    )
      return;
    this.sending = true;
    try {
      const jobs = await this.repository.outbox(5);
      await Promise.all(
        jobs.map(async (job) => {
          let delivered = false;
          try {
            await this.mail.send(job);
            delivered = true;
          } catch {
            this.logger.warn({ event: 'mail-delivery-failed', jobId: job.id });
          }
          await this.repository.finishMail(job, delivered);
        }),
      );
    } catch {
      this.logger.error('Outbox tick failed');
    } finally {
      this.sending = false;
    }
  }

  @Cron('0 */15 8-23 * * 1', { timeZone: 'Asia/Tashkent' })
  async digest() {
    if (process.env.WORKERS_DISABLED === 'true') return;
    const week = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      dateStyle: 'short',
    }).format(new Date());
    await this.repository.queueDigests(week);
  }

  @Cron('0 0 3 * * *', { timeZone: 'Asia/Tashkent' })
  async prune() {
    if (process.env.WORKERS_DISABLED !== 'true') await this.repository.prune();
  }
}
