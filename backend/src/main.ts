import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { SuccessResponseInterceptor } from './shared/interceptors/success-response.interceptor';
import { LogisticsService } from './modules/logistics/services/logistics.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: true,
    credentials: true,
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

  // Seed logistics data
  try {
    const logisticsService = app.get(LogisticsService);
    const existing = await logisticsService.findAll();
    if (existing.length === 0) {
      const dispatches = [
        { id: 'DS001', projectId: 'P001', customer: 'Ramesh Joshi', items: '125 Panels, 1 Inverter, BOS Kit', from: 'WH-Ahmedabad', to: 'GIDC Ahmedabad', status: 'Delivered', dispatchDate: '2026-02-20', driver: 'Mahesh K.', vehicle: 'GJ-01-AB-1234', cost: 8500, isActive: true, deliveredDate: new Date('2026-02-20') },
        { id: 'DS002', projectId: 'P002', customer: 'Suresh Bhatt', items: '375 Panels, 3 Inverters', from: 'WH-Ahmedabad', to: 'Vapi GIDC', status: 'In Transit', dispatchDate: '2026-02-25', driver: 'Raju S.', vehicle: 'GJ-05-CD-5678', cost: 22000, isActive: true },
        { id: 'DS003', projectId: 'P001', customer: 'Ramesh Joshi', items: 'Mounting Structure (GI) x5 Sets', from: 'WH-Surat', to: 'GIDC Ahmedabad', status: 'Scheduled', dispatchDate: '2026-02-28', driver: 'TBD', vehicle: 'TBD', cost: 6000, isActive: true },
        { id: 'DS004', projectId: 'P004', customer: 'Dinesh Trivedi', items: '140 Panels, 2x50kW Inverters', from: 'WH-Ahmedabad', to: 'Nadiad Plant', status: 'Scheduled', dispatchDate: '2026-03-05', driver: 'TBD', vehicle: 'TBD', cost: 9500, isActive: true },
      ];
      for (const dispatch of dispatches) {
        await logisticsService.create(dispatch);
      }
      console.log('✓ Seeded 4 logistics dispatches');
    }
  } catch (err: any) {
    console.log('Logistics seed skipped:', err.message);
  }
}

void bootstrap();
