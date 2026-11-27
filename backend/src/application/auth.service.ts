import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNTS,
  SECURITY,
  type Account,
  type AccountsRepository,
  type Challenge,
  type ChallengeKind,
  type Session,
} from './ports';
import { User } from '../domain/entities/User';
import { Email } from '../domain/value-objects/Email';
import { DomainError } from '../domain/errors/DomainError';
import { UnauthorizedError } from '../domain/errors/UnauthorizedError';
import { NotFoundError } from '../domain/errors/NotFoundError';
import { publicOrigin } from './public-origin';
import { DEFAULT_PREFERENCES, type Preferences } from '../domain/monitoring';

export interface CredentialTools {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash?: string | null): Promise<boolean>;
  token(): string;
  code(): string;
  digest(value: string): string;
}

export function profile(account: Account) {
  return {
    id: account.id,
    name: account.full_name,
    email: account.email,
    emailVerified: account.email_verified_at !== null,
    joined: new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Tashkent',
    }).format(new Date(account.created_at)),
    createdAt: new Date(account.created_at).toISOString(),
    plan: 'Starter plan',
    avatarUrl: account.avatar_mime ? '/api/avatars/' + account.id : null,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ACCOUNTS) private readonly accounts: AccountsRepository,
    @Inject(SECURITY) private readonly secret: CredentialTools,
  ) {}

  async limit(scope: string, subject: string, max: number, seconds: number) {
    const key = this.secret.digest('rate:' + scope + ':' + subject);
    if (!(await this.accounts.throttle(key, max, seconds))) {
      throw new DomainError(
        'Too many requests. Try again later.',
        429,
        'RATE_LIMITED',
      );
    }
  }

  private challenge(email: string, kind: ChallengeKind): Challenge {
    const value = kind === 'verify' ? this.secret.code() : this.secret.token();
    const href = new URL('/reset-password', publicOrigin());
    href.searchParams.set('email', email);
    href.searchParams.set('token', value);
    return {
      kind,
      digest: this.challengeDigest(email, kind, value),
      expires: new Date(Date.now() + (kind === 'verify' ? 10 : 30) * 60000),
      mail: {
        to: email,
        subject:
          kind === 'verify'
            ? 'Verify your Deal Alert email'
            : 'Reset your Deal Alert password',
        text:
          kind === 'verify'
            ? 'Your verification code: ' + value + '. It expires in 10 minutes.'
            : 'Open this link to reset your password. It expires in 30 minutes: ' +
              href.href,
      },
    };
  }

  private challengeDigest(email: string, kind: ChallengeKind, value: string) {
    return this.secret.digest('challenge:' + kind + ':' + email + ':' + value);
  }

  async register(input: {
    name: string;
    email: string;
    password: string;
    terms: true;
  }) {
    const account = new User(input.name, input.email);
    const email = account.email.toString();
    await this.limit('register-address', email, 3, 3600);
    if (!(await this.accounts.byEmail(email))) {
      const passwordHash = await this.secret.hashPassword(input.password);
      try {
        await this.accounts.register({
          name: account.name,
          email,
          passwordHash,
          challenge: this.challenge(email, 'verify'),
        });
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    return { accepted: true };
  }

  async issueChallenge(inputEmail: string, kind: ChallengeKind) {
    const email = new Email(inputEmail).toString();
    await this.limit(kind + '-send', email, 1, 60);
    const account = await this.accounts.byEmail(email);
    if (
      account?.password_hash &&
      (kind !== 'verify' || !account.email_verified_at)
    ) {
      await this.accounts.challenge(account, this.challenge(email, kind));
    }
    return { accepted: true };
  }

  async verify(input: { email: string; code: string }, agent?: string) {
    const email = new Email(input.email).toString();
    await this.limit('verify-attempt', email, 8, 600);
    const id = await this.accounts.consume(
      email,
      'verify',
      this.challengeDigest(email, 'verify', input.code),
    );
    if (!id) throw new UnauthorizedError('The code is invalid or expired');
    return this.startSession(await this.requireAccount(id), false, agent);
  }

  async reset(input: { email: string; token: string; password: string }) {
    const email = new Email(input.email).toString();
    await this.limit('reset-attempt', email, 6, 600);
    const passwordHash = await this.secret.hashPassword(input.password);
    if (
      !(await this.accounts.consume(
        email,
        'reset',
        this.challengeDigest(email, 'reset', input.token),
        passwordHash,
      ))
    ) {
      throw new UnauthorizedError('The reset link is invalid or expired');
    }
    return { updated: true };
  }

  async login(
    input: { email: string; password: string; remember: boolean },
    agent?: string,
  ) {
    const email = new Email(input.email).toString();
    await this.limit('login-address', email, 20, 900);
    const account = await this.accounts.byEmail(email);
    const valid = await this.secret.verifyPassword(
      input.password,
      account?.password_hash,
    );
    if (!account || !valid)
      throw new UnauthorizedError('Email or password is incorrect');
    if (!account.email_verified_at)
      throw new DomainError(
        'Verify your email before signing in',
        403,
        'EMAIL_UNVERIFIED',
      );
    return this.startSession(account, input.remember, agent);
  }

  private async startSession(
    account: Account,
    remember: boolean,
    agent?: string,
  ) {
    const token = this.secret.token();
    const expiresAt = new Date(
      Date.now() + (remember ? 30 * 86400000 : 12 * 3600000),
    );
    const hash = account.password_hash;
    if (
      !hash ||
      !(await this.accounts.session(
        account.id,
        hash,
        this.secret.digest('session:' + token),
        expiresAt,
        agent,
      ))
    ) {
      throw new UnauthorizedError('The account changed. Sign in again.');
    }
    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt,
      user: profile(account),
    };
  }

  async identify(value?: string) {
    const token = /^Bearer ([\w-]{43})$/.exec(value ?? '')?.[1];
    if (!token)
      throw new DomainError('Sign in is required', 401, 'SESSION_REQUIRED');
    const session = await this.accounts.identify(
      this.secret.digest('session:' + token),
    );
    if (!session)
      throw new DomainError(
        'Session expired or revoked',
        401,
        'SESSION_EXPIRED',
      );
    return session;
  }

  async requireAccount(id: string) {
    const account = await this.accounts.byId(id);
    if (!account) throw new NotFoundError('Account not found');
    return account;
  }

  async update(
    session: Session,
    input: { name?: string; email?: string; currentPassword?: string },
  ) {
    const current = await this.requireAccount(session.userId);
    const email = input.email ? new Email(input.email).toString() : undefined;
    const changed = email && email !== current.email;
    let challenge: Challenge | undefined;
    if (changed) {
      await this.limit('change-email', session.userId, 4, 3600);
      await this.requirePassword(current, input.currentPassword ?? '');
      challenge = this.challenge(email, 'verify');
    }
    const result = await this.accounts.update(
      session.userId,
      { name: input.name, email },
      challenge,
    );
    if (!result) throw new NotFoundError('Account not found');
    return { user: profile(result), needsVerification: Boolean(challenge) };
  }

  private async requirePassword(account: Account, password: string) {
    if (
      !(await this.secret.verifyPassword(password, account.password_hash)) ||
      !account.password_hash
    ) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    return account.password_hash;
  }

  async updatePassword(
    session: Session,
    input: { currentPassword: string; password: string },
  ) {
    await this.limit('change-password', session.userId, 10, 900);
    const account = await this.requireAccount(session.userId);
    const currentHash = await this.requirePassword(
      account,
      input.currentPassword,
    );
    if (
      !(await this.accounts.password(
        account.id,
        currentHash,
        await this.secret.hashPassword(input.password),
        session.id,
      ))
    ) {
      throw new DomainError(
        'Account changed. Retry the operation.',
        409,
        'ACCOUNT_CHANGED',
      );
    }
    return { updated: true };
  }

  async remove(session: Session, currentPassword: string) {
    await this.limit('delete-account', session.userId, 5, 900);
    const account = await this.requireAccount(session.userId);
    const hash = await this.requirePassword(account, currentPassword);
    if (!(await this.accounts.delete(account.id, hash)))
      throw new DomainError('Account changed. Retry the operation.', 409);
  }

  async preferences(id: string, patch?: Partial<Preferences>) {
    if (patch) return this.accounts.preferences(id, patch);
    return {
      ...DEFAULT_PREFERENCES,
      ...(await this.requireAccount(id)).preferences,
    };
  }
}
