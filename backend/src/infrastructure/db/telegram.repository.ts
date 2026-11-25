import { Inject, Injectable } from '@nestjs/common';
import type {
  TelegramAccounts,
  TelegramLinkResult,
} from '../../application/telegram-link.service';
import { DATABASE, type Database } from './drizzle/drizzle.service';

@Injectable()
export class PgTelegramRepository implements TelegramAccounts {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async linked(userId: string) {
    const [row] = await this.db.query<{ linked: boolean }>(
      'select telegram_id is not null as linked from users where id=$1',
      [userId],
    );
    return Boolean(row?.linked);
  }

  async issue(userId: string, digest: string, expires: Date) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.query<{ id: string }>(
        'select id from users where id=$1 and email_verified_at is not null and telegram_id is null for update',
        [userId],
      );
      if (!user) return false;
      await tx.query(
        'insert into telegram_link_challenges(user_id,digest,expires_at) values($1,$2,$3) ' +
          'on conflict(user_id) do update set digest=excluded.digest,expires_at=excluded.expires_at',
        [userId, digest, expires],
      );
      return true;
    });
  }

  async consume(
    digest: string,
    telegramId: string,
  ): Promise<TelegramLinkResult> {
    try {
      return await this.db.transaction(async (tx) => {
        const [link] = await tx.query<{ user_id: string }>(
          'select user_id from telegram_link_challenges where digest=$1 and expires_at>now()',
          [digest],
        );
        if (!link) return 'invalid';
        const [user] = await tx.query<{ telegram_id: string | null }>(
          'select telegram_id from users where id=$1 and email_verified_at is not null for update',
          [link.user_id],
        );
        if (!user) return 'invalid';
        if (user.telegram_id !== null) return 'conflict';
        const [consumed] = await tx.query(
          'delete from telegram_link_challenges where user_id=$1 and digest=$2 and expires_at>now() returning user_id',
          [link.user_id, digest],
        );
        if (!consumed) return 'invalid';
        await tx.query(
          'update users set telegram_id=$2,chat_id=$2 where id=$1',
          [link.user_id, telegramId],
        );
        return 'linked';
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      )
        return 'conflict';
      throw error;
    }
  }

  async owner(telegramId: string) {
    const [row] = await this.db.query<{ id: string }>(
      'select id from users where telegram_id=$1 and chat_id=$1 and email_verified_at is not null',
      [telegramId],
    );
    return row?.id ?? null;
  }

  async unlink(userId: string) {
    await this.db.transaction(async (tx) => {
      await tx.query(
        'update users set telegram_id=null,chat_id=null where id=$1',
        [userId],
      );
      await tx.query('delete from telegram_link_challenges where user_id=$1', [
        userId,
      ]);
    });
  }

  async claimUpdate(updateId: number) {
    const updates = await this.db.query(
      "insert into telegram_updates(id) values($1) on conflict(id) do update set received_at=now() where telegram_updates.completed_at is null and telegram_updates.received_at<now()-interval '90 seconds' returning id",
      [updateId],
    );
    if (updates.length) return 'claimed';
    const [existing] = await this.db.query<{ completed_at: Date | null }>(
      'select completed_at from telegram_updates where id=$1',
      [updateId],
    );
    return existing?.completed_at ? 'done' : 'leased';
  }

  async completeUpdate(updateId: number) {
    await this.db.query(
      'update telegram_updates set completed_at=now() where id=$1',
      [updateId],
    );
  }

  async retryUpdate(updateId: number) {
    await this.db.query('delete from telegram_updates where id=$1', [updateId]);
  }
}
