import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const prefix = config.get<string>('app.prefix', 'api/v1');
  const corsOrigin = config.get<string>('app.cors_origin', 'http://localhost:3000');
  const port = config.get<number>('app.port', 3001);

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: corsOrigin });

  await app.listen(port);
  Logger.log(`Backend: http://localhost:${port}/${prefix}`, 'Bootstrap');
}
bootstrap();
