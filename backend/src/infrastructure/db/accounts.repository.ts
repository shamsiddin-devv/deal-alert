import { Inject, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { DEFAULT_PREFERENCES, type Preferences } from '../../domain/monitoring';
import type {
  Account,
  AccountsRepository,
  Challenge,
  ChallengeKind,
  RoleAction,
  Session,
  SessionView,
} from '../../application/ports';
import { Credentials } from '../security/credentials';
import { DATABASE, type Database, type Sql } from './drizzle/drizzle.service';

const accountFields =
  'id, full_name, email, password_hash, email_verified_at, created_at, preferences, avatar_mime';

@Injectable()
export class PgAccountsRepository implements AccountsRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly credentials: Credentials,
  ) {}

  async byEmail(email: string) {
    return (
      (
        await this.db.query<Account>(
          'select ' + accountFields + ' from users where lower(email)=$1',
          [email],
        )
      )[0] ?? null
    );
  }

  async byId(id: string) {
    return (
      (
        await this.db.query<Account>(
          'select ' + accountFields + ' from users where id=$1',
          [id],
        )
      )[0] ?? null
    );
  }

  private async issue(db: Sql, id: string, challenge: Challenge) {
    await db.query(
      'insert into auth_challenges(user_id,kind,digest,expires_at,attempts) values($1,$2,$3,$4,5) ' +
        'on conflict(user_id,kind) do update set digest=excluded.digest,expires_at=excluded.expires_at,attempts=5',
      [id, challenge.kind, challenge.digest, challenge.expires],
    );
    const prefix = 'auth:' + challenge.kind + ':' + id + ':';
    await db.query(
      "update email_outbox set failed_at=now(),payload='' where user_id=$1 and event_key like $2 and delivered_at is null",
      [id, prefix + '%'],
    );
    await db.query(
      'insert into email_outbox(user_id,event_key,payload,expires_at) values($1,$2,$3,$4)',
      [
        id,
        prefix + challenge.digest,
        this.credentials.seal(challenge.mail),
        challenge.expires,
      ],
    );
  }

  register(input: {
    name: string;
    email: string;
    passwordHash: string;
    challenge: Challenge;
  }) {
    return this.db.transaction(async (db) => {
      const [user] = await db.query<Account>(
        'insert into users(full_name,email,password_hash) values($1,$2,$3) returning ' +
          accountFields,
        [input.name, input.email, input.passwordHash],
      );
      await this.issue(db, user.id, input.challenge);
      return user;
    });
  }

  challenge(account: Account, challenge: Challenge) {
    return this.db.transaction(async (db) => {
      const [current] = await db.query<Account>(
        'select ' + accountFields + ' from users where id=$1 for update',
        [account.id],
      );
      if (
        current?.email === account.email &&
        (challenge.kind !== 'verify' || !current.email_verified_at)
      ) {
        await this.issue(db, account.id, challenge);
      }
    });
  }

  consume(
    email: string,
    kind: ChallengeKind,
    digest: string,
    passwordHash?: string,
  ) {
    return this.db.transaction(async (db) => {
      const [user] = await db.query<{ id: string }>(
        'select id from users where lower(email)=$1 for update',
        [email],
      );
      if (!user) return null;
      const [challenge] = await db.query<{ digest: string }>(
        'select digest from auth_challenges where user_id=$1 and kind=$2 and expires_at>now() and attempts>0 for update',
        [user.id, kind],
      );
      if (!challenge) return null;
      if (
        !timingSafeEqual(
          Buffer.from(challenge.digest, 'hex'),
          Buffer.from(digest, 'hex'),
        )
      ) {
        await db.query(
          'update auth_challenges set attempts=attempts-1 where user_id=$1 and kind=$2',
          [user.id, kind],
        );
        return null;
      }
      await db.query(
        'delete from auth_challenges where user_id=$1 and kind=$2',
        [user.id, kind],
      );
      if (kind === 'verify') {
        await db.query(
          'update users set email_verified_at=now(),updated_at=now() where id=$1',
          [user.id],
        );
      } else {
        await db.query(
          'update users set password_hash=$2,updated_at=now() where id=$1',
          [user.id, passwordHash],
        );
        await db.query('delete from auth_sessions where user_id=$1', [user.id]);
      }
      return user.id;
    });
  }

  session(
    userId: string,
    expectedPasswordHash: string,
    hash: string,
    expires: Date,
    agent?: string,
  ) {
    return this.db.transaction(async (db) => {
      const [account] = await db.query<{ id: string }>(
        'select id from users where id=$1 and password_hash=$2 and email_verified_at is not null for update',
        [userId, expectedPasswordHash],
      );
      if (!account) return null;
      const [session] = await db.query<{ id: string }>(
        'insert into auth_sessions(user_id,digest,expires_at,agent) values($1,$2,$3,$4) returning id',
        [userId, hash, expires, agent?.slice(0, 255) ?? null],
      );
      return session.id;
    });
  }

  async identify(hash: string) {
    return (
      (
        await this.db.query<Session>(
          'select s.id,s.user_id as "userId" from auth_sessions s join users u on u.id=s.user_id ' +
            'where s.digest=$1 and s.expires_at>now() and u.email_verified_at is not null',
          [hash],
        )
      )[0] ?? null
    );
  }

  sessions(userId: string) {
    return this.db.query<SessionView>(
      'select id,created_at,expires_at,agent from auth_sessions where user_id=$1 and expires_at>now() order by created_at desc',
      [userId],
    );
  }

  async revoke(userId: string, sessionId: string) {
    await this.db.query(
      'delete from auth_sessions where user_id=$1 and id=$2',
      [userId, sessionId],
    );
  }

  update(userId: string, patch: RoleAction, challenge?: Challenge) {
    return this.db.transaction(async (db) => {
      const [account] = await db.query<Account>(
        'update users set full_name=coalesce($2,full_name),email=coalesce($3,email),' +
          'email_verified_at=case when $3::text is distinct from email and $3 is not null then null else email_verified_at end,' +
          'updated_at=now() where id=$1 returning ' +
          accountFields,
        [userId, patch.name ?? null, patch.email ?? null],
      );
      if (account && challenge) {
        await db.query('delete from auth_sessions where user_id=$1', [userId]);
        await db.query('delete from auth_challenges where user_id=$1', [
          userId,
        ]);
        await this.issue(db, userId, challenge);
      }
      return account ?? null;
    });
  }

  password(
    userId: string,
    expectedHash: string,
    newHash: string,
    keepSession?: string,
  ) {
    return this.db.transaction(async (db) => {
      const changed = await db.query(
        'update users set password_hash=$3,updated_at=now() where id=$1 and password_hash=$2 returning id',
        [userId, expectedHash, newHash],
      );
      if (!changed.length) return false;
      await db.query(
        'delete from auth_sessions where user_id=$1 and ($2::uuid is null or id<>$2)',
        [userId, keepSession ?? null],
      );
      await db.query(
        "delete from auth_challenges where user_id=$1 and kind='reset'",
        [userId],
      );
      return true;
    });
  }

  async preferences(userId: string, patch: Partial<Preferences>) {
    const [row] = await this.db.query<{ preferences: Partial<Preferences> }>(
      'update users set preferences=preferences || $2::jsonb,updated_at=now() where id=$1 returning preferences',
      [userId, JSON.stringify(patch)],
    );
    return { ...DEFAULT_PREFERENCES, ...row?.preferences };
  }

  async setAvatar(userId: string, mime: string, bytes: Buffer) {
    await this.db.query(
      'update users set avatar_mime=$2,avatar_bytes=$3,updated_at=now() where id=$1',
      [userId, mime, bytes],
    );
  }

  async avatar(userId: string) {
    return (
      (
        await this.db.query<{ mime: string; bytes: Buffer }>(
          'select avatar_mime as mime,avatar_bytes as bytes from users where id=$1 and avatar_bytes is not null',
          [userId],
        )
      )[0] ?? null
    );
  }

  async delete(userId: string, expectedHash: string) {
    return (
      (
        await this.db.query(
          'delete from users where id=$1 and password_hash=$2 returning id',
          [userId, expectedHash],
        )
      ).length === 1
    );
  }

  async throttle(key: string, maximum: number, windowSeconds: number) {
    const [row] = await this.db.query<{ count: number }>(
      'insert into request_throttles(key,count,expires_at) values($1,1,now()+make_interval(secs=>$2)) ' +
        'on conflict(key) do update set count=case when request_throttles.expires_at<=now() then 1 else request_throttles.count+1 end,' +
        'expires_at=case when request_throttles.expires_at<=now() then excluded.expires_at else request_throttles.expires_at end returning count',
      [key, windowSeconds],
    );
    return row.count <= maximum;
  }
}
