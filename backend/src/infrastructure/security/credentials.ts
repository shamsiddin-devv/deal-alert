import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ValidationError } from '../../domain/errors/ValidationError';

@Injectable()
export class Credentials {
  private readonly key: Buffer;
  private readonly dummyHash = bcrypt.hashSync(
    'deal-alert-invalid-account',
    12,
  );

  constructor() {
    const secret = process.env.APP_SECRET;
    if (
      !secret ||
      Buffer.byteLength(secret) < 32 ||
      secret.startsWith('replace-with-')
    ) {
      throw new Error(
        'APP_SECRET must be a unique secret of at least 32 bytes',
      );
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  hashPassword(password: string) {
    if (password.length < 6 || Buffer.byteLength(password) > 72) {
      throw new ValidationError(
        'Use at least 6 characters and at most 72 UTF-8 bytes',
      );
    }
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash?: string | null) {
    if (Buffer.byteLength(password) > 72) return false;
    const valid = await bcrypt.compare(password, hash ?? this.dummyHash);
    return Boolean(hash) && valid;
  }

  token() {
    return randomBytes(32).toString('base64url');
  }
  code() {
    return String(randomInt(0, 1000000)).padStart(6, '0');
  }
  digest(value: string) {
    return createHmac('sha256', this.key).update(value).digest('hex');
  }

  seal<T>(value: T) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64url',
    );
  }

  open<T>(value: string): T {
    const raw = Buffer.from(value, 'base64url');
    const cipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      raw.subarray(0, 12),
    );
    cipher.setAuthTag(raw.subarray(12, 28));
    const data = Buffer.concat([
      cipher.update(raw.subarray(28)),
      cipher.final(),
    ]);
    return JSON.parse(data.toString('utf8')) as T;
  }
}
