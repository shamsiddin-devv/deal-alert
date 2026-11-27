import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configure } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  configure(app);
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid PORT');
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap().catch((error) => {
  new Logger('Bootstrap').error(
    error instanceof Error ? error.message : 'Server failed to start',
  );
  process.exitCode = 1;
});
