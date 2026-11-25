import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { Bot, Context } from 'grammy';
import type { Update } from 'grammy/types';
import { publicOrigin } from '../../application/public-origin';
import {
  TelegramLinkService,
  TELEGRAM_ACCOUNTS,
  type TelegramAccounts,
} from '../../application/telegram-link.service';
import { WorkspaceService } from '../../application/workspace.service';
import { DomainError } from '../../domain/errors/DomainError';
import { createTelegramBot } from './telegram-bot';

@Injectable()
export class TelegramGateway
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TelegramGateway.name);
  private readonly secret?: string;
  private readonly bot?: Bot<Context>;
  private readonly polling = process.env.TELEGRAM_POLLING === 'true';
  private stopping = false;
  readonly username?: string;

  constructor(
    @Inject(TELEGRAM_ACCOUNTS) private readonly accounts: TelegramAccounts,
    links: TelegramLinkService,
    workspace: WorkspaceService,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const explicitSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const appSecret = process.env.APP_SECRET;
    const secret =
      explicitSecret ||
      (appSecret &&
        createHmac('sha256', appSecret)
          .update('telegram-webhook')
          .digest('base64url'));
    const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '');
    if (
      token &&
      secret &&
      username &&
      /^[0-9]+:[\w-]+$/.test(token) &&
      /^[\w-]{24,256}$/.test(secret) &&
      /^[a-z0-9_]{2,29}bot$/i.test(username)
    ) {
      this.bot = createTelegramBot(token, links, workspace, {
        client: { timeoutSeconds: this.polling ? 25 : 5 },
      });
      this.secret = secret;
      this.username = username;
    } else if (token || explicitSecret || username) {
      this.logger.warn('Telegram configuration is incomplete or invalid');
    }
  }

  onApplicationBootstrap() {
    if (!this.bot || !this.secret) return;
    const origin = publicOrigin();
    if (
      this.polling &&
      origin.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    ) {
      void this.startPolling(this.bot);
      return;
    }
    if (process.env.TELEGRAM_AUTO_WEBHOOK !== 'true') return;
    const webhookOrigin = process.env.RENDER_EXTERNAL_URL
      ? new URL(process.env.RENDER_EXTERNAL_URL)
      : origin;
    if (webhookOrigin.protocol !== 'https:') {
      this.logger.warn('Telegram webhook requires an HTTPS origin');
      return;
    }
    void this.registerWebhook(
      this.bot,
      new URL('/api/telegram/webhook', webhookOrigin).href,
      this.secret,
    );
  }

  async onApplicationShutdown() {
    this.stopping = true;
    if (this.bot?.isRunning()) {
      try {
        await this.bot.stop();
      } catch {
        this.logger.warn('Telegram polling shutdown failed');
      }
    }
  }

  private async matchesUsername(bot: Bot<Context>) {
    await bot.init();
    if (bot.botInfo.username?.toLowerCase() === this.username?.toLowerCase())
      return true;
    this.logger.error(
      'Configured Telegram bot username does not match its token',
    );
    return false;
  }

  private async startPolling(bot: Bot<Context>) {
    try {
      if (!(await this.matchesUsername(bot))) return;
      if ((await bot.api.getWebhookInfo()).url) {
        this.logger.warn(
          'Telegram polling skipped because a webhook is already registered',
        );
        return;
      }
      if (this.stopping) return;
      bot.catch(() => this.logger.warn('Telegram polling update failed'));
      await bot.start({
        allowed_updates: ['message', 'callback_query'],
        timeout: 20,
        onStart: () => this.logger.log('Telegram polling started'),
      });
    } catch {
      if (!this.stopping) this.logger.error('Telegram polling failed');
    }
  }

  private async registerWebhook(
    bot: Bot<Context>,
    url: string,
    secret: string,
  ) {
    try {
      if (!(await this.matchesUsername(bot))) return;
      await bot.api.setWebhook(url, {
        secret_token: secret,
        allowed_updates: ['message', 'callback_query'],
        max_connections: 10,
      });
      await bot.api.setMyCommands([
        { command: 'menu', description: 'Kuzatuv va takliflar' },
        { command: 'qidir', description: 'Mahsulot nomi bo‘yicha qidirish' },
      ]);
    } catch {
      this.logger.error('Telegram webhook registration failed');
    }
  }

  async update(header: string | undefined, input: unknown) {
    if (!this.bot || !this.secret)
      throw new DomainError(
        'Telegram is not configured',
        404,
        'TELEGRAM_DISABLED',
      );
    const supplied = Buffer.from(header ?? '');
    const expected = Buffer.from(this.secret);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new DomainError(
        'Invalid webhook key',
        403,
        'TELEGRAM_WEBHOOK_DENIED',
      );
    }
    if (!isTelegramUpdate(input))
      throw new DomainError(
        'Invalid Telegram update',
        400,
        'TELEGRAM_INVALID_UPDATE',
      );
    const claim = await this.accounts.claimUpdate(input.update_id);
    if (claim === 'done') return { ok: true };
    if (claim === 'leased')
      throw new DomainError(
        'Telegram update is in progress',
        503,
        'TELEGRAM_RETRY',
      );
    try {
      await this.bot.init();
      await this.bot.handleUpdate(input);
      await this.accounts.completeUpdate(input.update_id);
      return { ok: true };
    } catch {
      await this.accounts.retryUpdate(input.update_id);
      this.logger.warn('Telegram update processing failed');
      throw new DomainError(
        'Telegram update could not be processed',
        503,
        'TELEGRAM_RETRY',
      );
    }
  }
}

function isTelegramUpdate(value: unknown): value is Update {
  return (
    typeof value === 'object' &&
    value !== null &&
    'update_id' in value &&
    typeof value.update_id === 'number' &&
    Number.isInteger(value.update_id) &&
    value.update_id > 0 &&
    value.update_id <= 2147483647
  );
}
