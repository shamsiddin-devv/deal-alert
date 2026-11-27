import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ACCOUNTS,
  type AccountsRepository,
  type Session,
} from '../../application/ports';
import { AuthService, profile } from '../../application/auth.service';
import { WorkspaceService } from '../../application/workspace.service';
import { CurrentSession, SessionGuard } from './http-boundaries';
import { DomainError } from '../../domain/errors/DomainError';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import * as dto from './validation';
import {
  browserLogin,
  clearBrowserSession,
  setBrowserSession,
} from './browser-session';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ACCOUNTS) private readonly accounts: AccountsRepository,
  ) {}

  private async throttle(req: Request, action: string) {
    await this.auth.limit(
      'auth-ip:' + action,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      30,
      900,
    );
  }

  @Post('register')
  @HttpCode(202)
  async register(@Body() body: unknown, @Req() req: Request) {
    await this.throttle(req, 'register');
    return this.auth.register(dto.parse(dto.register, body));
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const browser = browserLogin(req);
    await this.throttle(req, 'login');
    const input = dto.parse(dto.login, body);
    const session = await this.auth.login(input, req.get('user-agent'));
    if (!browser) return session;
    setBrowserSession(
      res,
      session.accessToken,
      input.remember ? session.expiresAt : undefined,
    );
    return { user: session.user, expiresAt: session.expiresAt };
  }

  @Post('verify-email')
  @HttpCode(200)
  async verify(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const browser = browserLogin(req);
    await this.throttle(req, 'verify');
    const session = await this.auth.verify(
      dto.parse(dto.verify, body),
      req.get('user-agent'),
    );
    if (!browser) return session;
    setBrowserSession(res, session.accessToken);
    return { user: session.user, expiresAt: session.expiresAt };
  }

  @Post('resend-verification')
  @HttpCode(202)
  async resend(@Body() body: unknown, @Req() req: Request) {
    await this.throttle(req, 'resend');
    return this.auth.issueChallenge(
      dto.parse(dto.challenge, body).email,
      'verify',
    );
  }

  @Post('forgot-password')
  @HttpCode(202)
  async forgot(@Body() body: unknown, @Req() req: Request) {
    await this.throttle(req, 'forgot');
    return this.auth.issueChallenge(
      dto.parse(dto.challenge, body).email,
      'reset',
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() body: unknown, @Req() req: Request) {
    await this.throttle(req, 'reset');
    return this.auth.reset(dto.parse(dto.reset, body));
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(
    @CurrentSession() session: Session,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.accounts.revoke(session.userId, session.id);
    clearBrowserSession(res);
  }
}

@Controller('me')
@UseGuards(SessionGuard)
export class MeController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ACCOUNTS) private readonly accounts: AccountsRepository,
    private readonly workspace: WorkspaceService,
  ) {}

  @Get()
  async get(@CurrentSession() session: Session) {
    return profile(await this.auth.requireAccount(session.userId));
  }

  @Patch()
  async update(
    @CurrentSession() session: Session,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.update(
      session,
      dto.parse(dto.profilePatch, body),
    );
    if (result.needsVerification) clearBrowserSession(response);
    return result;
  }

  @Get('preferences')
  preferences(@CurrentSession() session: Session) {
    return this.auth.preferences(session.userId);
  }

  @Patch('preferences')
  updatePreferences(@CurrentSession() session: Session, @Body() body: unknown) {
    return this.auth.preferences(
      session.userId,
      dto.parse(dto.preferences, body),
    );
  }

  @Put('password')
  password(@CurrentSession() session: Session, @Body() body: unknown) {
    return this.auth.updatePassword(
      session,
      dto.parse(dto.changePassword, body),
    );
  }

  @Get('sessions')
  async sessions(@CurrentSession() session: Session) {
    return (await this.accounts.sessions(session.userId)).map((row) => ({
      id: row.id,
      userAgent: row.agent,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      current: row.id === session.id,
    }));
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async revoke(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const sessionId = dto.parse(dto.uuid, id);
    await this.accounts.revoke(session.userId, sessionId);
    if (sessionId === session.id) clearBrowserSession(response);
  }

  @Get('export')
  async export(@CurrentSession() session: Session) {
    const [user, data, preferences] = await Promise.all([
      this.auth.requireAccount(session.userId),
      this.workspace.repository.export(session.userId),
      this.auth.preferences(session.userId),
    ]);
    return {
      profile: profile(user),
      preferences,
      workspace: data,
      exportedAt: new Date(),
    };
  }

  @Put('avatar')
  async avatar(@CurrentSession() session: Session, @Body() value: unknown) {
    await this.auth.limit('avatar', session.userId, 12, 3600);
    const { mime, data } = dto.parse(dto.avatar, value);
    const bytes = Buffer.from(data, 'base64');
    const signature =
      mime === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : mime === 'image/jpeg'
          ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
          : bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
            bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!signature || bytes.length < 20 || bytes.length > 128000)
      throw new DomainError(
        'Upload a valid image under 128 kB',
        422,
        'INVALID_IMAGE',
      );
    await this.accounts.setAvatar(session.userId, mime, bytes);
    return { avatarUrl: '/api/avatars/' + session.userId };
  }

  @Delete()
  @HttpCode(204)
  async delete(
    @CurrentSession() session: Session,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.remove(
      session,
      dto.parse(dto.provePassword, body).currentPassword,
    );
    clearBrowserSession(response);
  }
}

@Controller('avatars')
@UseGuards(SessionGuard)
export class AvatarController {
  constructor(
    @Inject(ACCOUNTS) private readonly accounts: AccountsRepository,
  ) {}

  @Get(':id')
  async read(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (id !== session.userId) throw new NotFoundError('Avatar not found');
    const avatar = await this.accounts.avatar(id);
    if (!avatar) throw new NotFoundError('Avatar not found');
    res.setHeader('Content-Type', avatar.mime);
    res.send(Buffer.from(avatar.bytes));
  }
}
