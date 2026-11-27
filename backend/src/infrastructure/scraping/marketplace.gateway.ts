import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';
import { Inject, Injectable } from '@nestjs/common';
import ipaddr from 'ipaddr.js';
import robotsParser from 'robots-parser';
import {
  MARKETPLACES,
  SOURCES,
  listingUrl,
  sourceForHost,
  type Source,
} from '../../domain/marketplace';
import { parseListing } from './adapters';
import { ScrapeError } from '../../domain/errors/ScrapeError';
import {
  MONITOR,
  type MarketplaceGateway,
  type MonitorRepository,
} from '../../application/ports';

type Response = {
  status: number;
  body: string;
  location?: string;
  retryAfter?: string;
  contentType?: string;
};
type Robots = ReturnType<typeof robotsParser>;
const bot = 'DealAlertBot';

const texnomartPolicy =
  'https://mini-io-api.texnomart.uz/newcontent/seo-file/robots.txt';

export function isRobotsLocation(source: Source, url: URL) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    return false;
  if (source === 'texnomart' && url.href === texnomartPolicy) return true;
  return (
    sourceForHost(url.hostname) === source &&
    url.pathname === '/robots.txt' &&
    !url.search &&
    !url.hash
  );
}

export function isRobotsBody(body: string, contentType?: string) {
  if (/^\s*</.test(body)) return false;
  if (contentType) return /^text\/plain(?:\s*;|$)/i.test(contentType);
  return /^\s*user-agent\s*:/im.test(body);
}

function retryAfter(value?: string) {
  const seconds =
    value && /^\d+$/.test(value)
      ? Number(value) * 1000
      : value
        ? Date.parse(value) - Date.now()
        : NaN;
  return Number.isFinite(seconds)
    ? Math.max(60000, Math.min(86400000, seconds))
    : 3600000;
}

async function publicRequest(
  url: URL,
  userAgent: string,
  maxBytes: number,
): Promise<Response> {
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true }),
    delay(5000, undefined, { ref: false }).then(() => {
      throw new ScrapeError('DNS_TIMEOUT');
    }),
  ]);
  if (
    !addresses.length ||
    addresses.some(
      (entry) => ipaddr.process(entry.address).range() !== 'unicast',
    )
  ) {
    throw new ScrapeError('NETWORK_ADDRESS_BLOCKED', 86400000);
  }
  const pinned = addresses[0];
  return new Promise<Response>((resolve, reject) => {
    const signal = AbortSignal.timeout(12000);
    const req = request(
      url,
      {
        method: 'GET',
        signal,
        agent: false,
        family: pinned.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, pinned.address, pinned.family),
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,text/plain;q=0.9',
          'Accept-Encoding': 'identity',
        },
      },
      (response) => {
        const result: Response = {
          status: response.statusCode ?? 0,
          body: '',
          location: response.headers.location,
          retryAfter:
            typeof response.headers['retry-after'] === 'string'
              ? response.headers['retry-after']
              : undefined,
          contentType: response.headers['content-type'],
        };
        if (result.status !== 200) {
          response.destroy();
          resolve(result);
          return;
        }
        if (
          response.headers['content-encoding'] &&
          response.headers['content-encoding'] !== 'identity'
        ) {
          response.destroy();
          reject(new ScrapeError('UNSUPPORTED_ENCODING'));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy(new ScrapeError('RESPONSE_TOO_LARGE', 86400000));
            return;
          }
          chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () =>
          resolve({ ...result, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

@Injectable()
export class PublicMarketplaceGateway implements MarketplaceGateway {
  private readonly policies = new Map<
    string,
    { rules: Robots; until: number }
  >();
  private readonly pendingPolicies = new Map<string, Promise<Robots>>();

  constructor(@Inject(MONITOR) private readonly budget: MonitorRepository) {}

  enabled() {
    const approvals = new Set(
      (process.env.SCRAPE_APPROVED_SOURCES ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase()),
    );
    return process.env.SCRAPE_CONTACT
      ? SOURCES.filter((source) => source !== 'olx' && approvals.has(source))
      : [];
  }

  private async fetch(
    source: Source,
    url: URL,
    spacing: number,
    maxBytes: number,
    policyRequest = false,
  ) {
    if (
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      (policyRequest
        ? !isRobotsLocation(source, url)
        : sourceForHost(url.hostname) !== source)
    ) {
      throw new ScrapeError('REDIRECT_BLOCKED', 86400000);
    }
    if (!(await this.budget.reserve(source, spacing))) {
      await delay(Math.min(spacing + 100, 11000));
      if (!(await this.budget.reserve(source, spacing)))
        throw new ScrapeError('SOURCE_RATE_LIMIT', Math.max(15000, spacing));
    }
    const response = await publicRequest(
      url,
      bot + ' (+mailto:' + process.env.SCRAPE_CONTACT + ')',
      maxBytes,
    );
    if (response.status === 429 || response.status === 503) {
      const retry = retryAfter(response.retryAfter);
      await this.budget.cooldown(source, retry);
      throw new ScrapeError('SOURCE_THROTTLED', retry);
    }
    if ([401, 403, 451].includes(response.status)) {
      await this.budget.cooldown(source, 86400000);
      throw new ScrapeError('SOURCE_ACCESS_DENIED', 86400000);
    }
    return response;
  }

  private async loadPolicy(source: Source, url: URL) {
    const origin = url.origin;
    const robotsUrl = new URL('/robots.txt', origin);
    let result = await this.fetch(
      source,
      robotsUrl,
      MARKETPLACES[source].interval,
      512000,
      true,
    );
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      let target: URL;
      try {
        target = new URL(result.location, robotsUrl);
      } catch {
        throw new ScrapeError('ROBOTS_UNAVAILABLE', 3600000);
      }
      if (target.href === robotsUrl.href || !isRobotsLocation(source, target)) {
        throw new ScrapeError('ROBOTS_UNAVAILABLE', 3600000);
      }
      result = await this.fetch(
        source,
        target,
        MARKETPLACES[source].interval,
        512000,
        true,
      );
    }
    if (result.status !== 200 && result.status !== 404)
      throw new ScrapeError('ROBOTS_UNAVAILABLE', 3600000);
    if (
      result.status === 200 &&
      !isRobotsBody(result.body, result.contentType)
    ) {
      throw new ScrapeError('ROBOTS_UNAVAILABLE', 3600000);
    }
    const rules = robotsParser(origin + '/robots.txt', result.body);
    this.policies.set(origin, { rules, until: Date.now() + 3600000 });
    return rules;
  }

  private async policy(source: Source, url: URL) {
    const cached = this.policies.get(url.origin);
    if (cached && cached.until > Date.now()) return cached.rules;
    const existing = this.pendingPolicies.get(url.origin);
    if (existing) return existing;
    const task = this.loadPolicy(source, url).finally(() =>
      this.pendingPolicies.delete(url.origin),
    );
    this.pendingPolicies.set(url.origin, task);
    return task;
  }

  async read(source: Source, url: URL) {
    if (!this.enabled().includes(source))
      throw new ScrapeError('SOURCE_NOT_APPROVED', 86400000);
    let target = listingUrl(url.href);
    for (let redirects = 0; redirects <= 2; redirects++) {
      if (target.source !== source)
        throw new ScrapeError('REDIRECT_BLOCKED', 86400000);
      const rules = await this.policy(source, target.url);
      if (rules.isAllowed(target.url.href, bot) !== true)
        throw new ScrapeError('ROBOTS_DISALLOWED', 86400000);
      const spacing = Math.max(
        MARKETPLACES[source].interval,
        (rules.getCrawlDelay(bot) ?? 0) * 1000,
      );
      const response = await this.fetch(source, target.url, spacing, 2000000);
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.location
      ) {
        try {
          target = listingUrl(new URL(response.location, target.url).href);
        } catch {
          throw new ScrapeError('REDIRECT_BLOCKED', 86400000);
        }
        continue;
      }
      if ([404, 410].includes(response.status))
        throw new ScrapeError('LISTING_NOT_FOUND', 21600000);
      if (
        response.status !== 200 ||
        !response.contentType?.startsWith('text/html')
      )
        throw new ScrapeError('SOURCE_HTTP_ERROR');
      return parseListing(source, target.url, response.body);
    }
    throw new ScrapeError('REDIRECT_LIMIT', 86400000);
  }
}
