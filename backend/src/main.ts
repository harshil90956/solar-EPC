import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { setServers } from 'dns';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { SuccessResponseInterceptor } from './shared/interceptors/success-response.interceptor';

async function bootstrap() {
  const dnsServersRaw = process.env.DNS_SERVERS;
  if (dnsServersRaw) {
    const servers = dnsServersRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length > 0) {
      setServers(servers);
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:8000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.APP_PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
}

void bootstrap();
