import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Mail, MailGateway } from '../../application/ports';
import { SmtpGateway } from './smtp.gateway';

@Injectable()
export class DeliveryMailGateway implements MailGateway {
  constructor(private readonly smtp: SmtpGateway) {}

  available() {
    return (
      Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM) ||
      this.smtp.available()
    );
  }

  async send(message: Mail) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!apiKey || !from) return this.smtp.send(message);
    const idempotencyKey =
      message.key && createHash('sha256').update(message.key).digest('hex');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    await response.body?.cancel();
    if (!response.ok)
      throw new Error('Email provider returned HTTP ' + response.status);
  }
}
