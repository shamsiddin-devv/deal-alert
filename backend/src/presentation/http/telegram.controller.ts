import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TelegramLinkService } from '../../application/telegram-link.service';
import type { Session } from '../../application/ports';
import { DomainError } from '../../domain/errors/DomainError';
import { TelegramGateway } from '../../infrastructure/telegram/telegram.gateway';
import { CurrentSession, SessionGuard } from './http-boundaries';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(private readonly gateway: TelegramGateway) {}

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Headers('x-telegram-bot-api-secret-token') key: string | undefined,
    @Body() update: unknown,
  ) {
    return this.gateway.update(key, update);
  }
}

@Controller('me/telegram')
@UseGuards(SessionGuard)
export class TelegramAccountController {
  constructor(
    private readonly links: TelegramLinkService,
    private readonly gateway: TelegramGateway,
  ) {}

  @Get()
  async status(@CurrentSession() session: Session) {
    return {
      enabled: Boolean(this.gateway.username),
      linked: await this.links.status(session.userId),
    };
  }

  @Post('link')
  @HttpCode(200)
  link(@CurrentSession() session: Session) {
    const username = this.gateway.username;
    if (!username)
      throw new DomainError(
        'Telegram is not configured',
        503,
        'TELEGRAM_DISABLED',
      );
    return this.links.link(session.userId, username);
  }

  @Delete()
  @HttpCode(204)
  unlink(@CurrentSession() session: Session) {
    return this.links.unlink(session.userId);
  }
}
