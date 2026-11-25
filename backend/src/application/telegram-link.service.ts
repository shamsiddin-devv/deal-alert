import { Inject, Injectable } from '@nestjs/common';
import { AuthService, type CredentialTools } from './auth.service';
import { SECURITY } from './ports';
import { DomainError } from '../domain/errors/DomainError';

export const TELEGRAM_ACCOUNTS = Symbol('TELEGRAM_ACCOUNTS');
export type TelegramLinkResult = 'linked' | 'invalid' | 'conflict';

export interface TelegramAccounts {
  linked(userId: string): Promise<boolean>;
  issue(userId: string, digest: string, expires: Date): Promise<boolean>;
  consume(digest: string, telegramId: string): Promise<TelegramLinkResult>;
  owner(telegramId: string): Promise<string | null>;
  unlink(userId: string): Promise<void>;
  claimUpdate(updateId: number): Promise<'claimed' | 'done' | 'leased'>;
  completeUpdate(updateId: number): Promise<void>;
  retryUpdate(updateId: number): Promise<void>;
}

@Injectable()
export class TelegramLinkService {
  constructor(
    @Inject(TELEGRAM_ACCOUNTS) private readonly accounts: TelegramAccounts,
    @Inject(SECURITY) private readonly credentials: CredentialTools,
    private readonly auth: AuthService,
  ) {}

  status(userId: string) {
    return this.accounts.linked(userId);
  }
  owner(telegramId: number) {
    return this.accounts.owner(String(telegramId));
  }
  unlink(userId: string) {
    return this.accounts.unlink(userId);
  }

  async link(userId: string, username: string) {
    await this.auth.limit('telegram-link', userId, 8, 900);
    const token = this.credentials.token();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    if (!(await this.accounts.issue(userId, this.digest(token), expiresAt))) {
      throw new DomainError(
        'Your account is already linked or unavailable',
        409,
        'TELEGRAM_LINK_CONFLICT',
      );
    }
    const url = new URL('https://t.me/' + username);
    url.searchParams.set('start', 'l_' + token);
    return { url: url.href, expiresAt };
  }

  consume(token: string, telegramId: number): Promise<TelegramLinkResult> {
    if (!/^[\w-]{43}$/.test(token)) return Promise.resolve('invalid');
    return this.accounts.consume(this.digest(token), String(telegramId));
  }

  private digest(token: string) {
    return this.credentials.digest('telegram-link:' + token);
  }
}
