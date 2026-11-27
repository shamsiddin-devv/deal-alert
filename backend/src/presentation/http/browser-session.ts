import type { Request, Response } from 'express';
import { publicOrigin } from '../../application/public-origin';
import { DomainError } from '../../domain/errors/DomainError';

const COOKIE = 'dealalert_session';

function options() {
  return {
    httpOnly: true,
    secure: publicOrigin().protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/api',
  };
}

export function verifyBrowserOrigin(request: Request) {
  if (request.get('origin') !== publicOrigin().origin) {
    throw new DomainError('Invalid request origin', 403, 'INVALID_ORIGIN');
  }
}

export function browserLogin(request: Request) {
  const browser = request.get('x-deal-client') === 'browser';
  if (browser) verifyBrowserOrigin(request);
  return browser;
}

export function setBrowserSession(
  response: Response,
  token: string,
  expires?: Date,
) {
  response.cookie(COOKIE, token, { ...options(), expires });
}

export function clearBrowserSession(response: Response) {
  response.clearCookie(COOKIE, options());
}

export function authorizationFor(request: Request) {
  if (request.headers.authorization) return request.headers.authorization;
  const tokens = request.headers.cookie
    ?.split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.startsWith(COOKIE + '='));
  if (tokens?.length !== 1) return;
  const token = tokens[0].slice(COOKIE.length + 1);
  if (!/^[\w-]{43}$/.test(token)) return;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
    verifyBrowserOrigin(request);
  return 'Bearer ' + token;
}
