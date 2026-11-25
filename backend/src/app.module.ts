import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthService } from './application/auth.service';
import { WorkspaceService } from './application/workspace.service';
import { MonitorService } from './application/monitor.service';
import {
  ACCOUNTS,
  EMAIL,
  MONITOR,
  SCRAPER,
  SECURITY,
  WORKSPACE,
} from './application/ports';
import { PgAccountsRepository } from './infrastructure/db/accounts.repository';
import { PgWorkspaceRepository } from './infrastructure/db/workspace.repository';
import { PgMonitorRepository } from './infrastructure/db/monitor.repository';
import { DrizzleModule } from './infrastructure/db/drizzle/drizzle.module';
import {
  DATABASE,
  type Database,
} from './infrastructure/db/drizzle/drizzle.service';
import { Credentials } from './infrastructure/security/credentials';
import { PublicMarketplaceGateway } from './infrastructure/scraping/marketplace.gateway';
import { DeliveryMailGateway } from './infrastructure/mail/mail.gateway';
import { SmtpGateway } from './infrastructure/mail/smtp.gateway';
import {
  AuthController,
  AvatarController,
  MeController,
} from './presentation/http/auth.controller';
import {
  MarketplaceController,
  WorkspaceController,
} from './presentation/http/workspace.controller';
import {
  TELEGRAM_ACCOUNTS,
  TelegramLinkService,
} from './application/telegram-link.service';
import { PgTelegramRepository } from './infrastructure/db/telegram.repository';
import { TelegramGateway } from './infrastructure/telegram/telegram.gateway';
import {
  TelegramAccountController,
  TelegramWebhookController,
} from './presentation/http/telegram.controller';
import { SessionGuard } from './presentation/http/http-boundaries';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  @Get()
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    try {
      await this.db.query(
        'select (select sample_owner_id from market_listings limit 1), (select completed_at from telegram_updates limit 1)',
      );
    } catch {
      throw new ServiceUnavailableException(
        'Database or migrations are not ready',
      );
    }
    return { status: 'ready' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DrizzleModule,
  ],
  controllers: [
    HealthController,
    TelegramWebhookController,
    TelegramAccountController,
    AuthController,
    MeController,
    AvatarController,
    MarketplaceController,
    WorkspaceController,
  ],
  providers: [
    AuthService,
    WorkspaceService,
    MonitorService,
    SessionGuard,
    TelegramLinkService,
    TelegramGateway,
    { provide: TELEGRAM_ACCOUNTS, useClass: PgTelegramRepository },
    Credentials,
    { provide: SECURITY, useExisting: Credentials },
    { provide: ACCOUNTS, useClass: PgAccountsRepository },
    { provide: WORKSPACE, useClass: PgWorkspaceRepository },
    { provide: MONITOR, useClass: PgMonitorRepository },
    { provide: SCRAPER, useClass: PublicMarketplaceGateway },
    SmtpGateway,
    { provide: EMAIL, useClass: DeliveryMailGateway },
  ],
})
export class AppModule {}
