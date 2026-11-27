import { statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { publicOrigin } from './application/public-origin';
import { ApiErrorFilter } from './presentation/http/http-boundaries';

export function configure(app: NestExpressApplication) {
  const origin = publicOrigin();
  const secureOrigin = origin.protocol === 'https:';
  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '256kb', inflate: false });
  app.use(
    helmet({
      strictTransportSecurity: secureOrigin ? undefined : false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
          upgradeInsecureRequests: secureOrigin ? [] : null,
        },
      },
    }),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (/^\/api(?:\/|$)/i.test(request.path)) {
      response.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  app.enableCors({
    origin: origin.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });
  if (process.env.FRONTEND_DIST_DIR)
    serveFrontend(app, process.env.FRONTEND_DIST_DIR);
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
}

function serveFrontend(app: NestExpressApplication, directory: string) {
  const dist = resolve(directory);
  const index = resolve(dist, 'index.html');
  if (!statSync(index, { throwIfNoEntry: false })?.isFile()) {
    throw new Error('FRONTEND_DIST_DIR must contain a built index.html');
  }
  app.useStaticAssets(resolve(dist, 'assets'), {
    prefix: '/assets/',
    index: false,
    redirect: false,
    maxAge: '1y',
    immutable: true,
  });
  app.useStaticAssets(resolve(dist, 'images'), {
    prefix: '/images/',
    index: false,
    redirect: false,
    maxAge: '1h',
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const path = request.path;
    const reserved = /^(?:\/api|\/assets|\/images)(?:\/|$)/i.test(path);
    const browserRequest =
      ['GET', 'HEAD'].includes(request.method) && request.accepts('html');
    if (!browserRequest || reserved || extname(path)) return next();
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(index, { cacheControl: false }, (error) => {
      if (error) next(error);
    });
  });
}
