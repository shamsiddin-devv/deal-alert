import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createTransport, type Transporter } from 'nodemailer';
import type { Mail, MailGateway } from '../../application/ports';

@Injectable()
export class SmtpGateway implements MailGateway {
  private transport?: Transporter;

  available() {
    return Boolean(process.env.SMTP_URL && process.env.MAIL_FROM);
  }

  async send(message: Mail) {
    const { SMTP_URL, MAIL_FROM } = process.env;
    if (!SMTP_URL || !MAIL_FROM) throw new Error('SMTP is not configured');
    if (!this.transport) {
      const smtp = new URL(SMTP_URL);
      if (!['smtp:', 'smtps:'].includes(smtp.protocol))
        throw new Error('SMTP_URL must use smtp or smtps');
      this.transport = createTransport({
        host: smtp.hostname,
        port: Number(smtp.port) || (smtp.protocol === 'smtps:' ? 465 : 587),
        secure: smtp.protocol === 'smtps:',
        requireTLS: smtp.protocol !== 'smtps:',
        auth: smtp.username
          ? {
              user: decodeURIComponent(smtp.username),
              pass: decodeURIComponent(smtp.password),
            }
          : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    }
    const domain =
      /@([a-z0-9.-]+)>?$/i.exec(MAIL_FROM)?.[1] ?? 'deal-alert.invalid';
    const messageId = message.key
      ? '<' +
        createHash('sha256').update(message.key).digest('hex') +
        '@' +
        domain +
        '>'
      : undefined;
    await this.transport.sendMail({
      from: MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      messageId,
    });
  }
}
