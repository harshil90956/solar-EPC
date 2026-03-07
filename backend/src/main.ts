import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { setServers } from 'dns';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { SuccessResponseInterceptor } from './shared/interceptors/success-response.interceptor';
import { LogisticsService } from './modules/logistics/services/logistics.service';
import { ProcurementService } from './modules/procurement/services/procurement.service';

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

  try {
    const { default: multipart } = await import('@fastify/multipart');
    await app.register(multipart as any, {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    });
  } catch (err: any) {
    // Optional dependency - skip if not installed
    console.warn('[bootstrap] @fastify/multipart not available, skipping multipart registration');
  }

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

  // Seed logistics data
  try {
    const logisticsService = app.get(LogisticsService);
    // Use a system user with ALL dataScope for seeding (bypasses visibility filters)
    const systemUser = { id: 'system', dataScope: 'ALL' as const, tenantId: 'default' };
    const existing = await logisticsService.findAll(systemUser);
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

  // Seed procurement vendors
  try {
    const procurementService = app.get(ProcurementService);
    // Use a system user with ALL dataScope for seeding (bypasses visibility filters)
    const systemUser = { id: 'system', dataScope: 'ALL' as const, tenantId: 'default' };
    const vendors = await procurementService.findAllVendors('default', systemUser);
    if (vendors.length === 0) {
      const sampleVendors = [
        { name: 'Tata Power Solar', category: 'Panel', contact: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'sales@tatapowersolar.com', city: 'Mumbai', rating: 5 },
        { name: 'Waaree Energies', category: 'Panel', contact: 'Sunil Patel', phone: '+91 98765 43211', email: 'contact@waaree.com', city: 'Surat', rating: 4 },
        { name: 'Sungrow India', category: 'Inverter', contact: 'Priya Sharma', phone: '+91 98765 43212', email: 'india@sungrow.com', city: 'Bangalore', rating: 5 },
        { name: 'ABB India', category: 'Inverter', contact: 'Vikram Mehta', phone: '+91 98765 43213', email: 'contact@abb.com', city: 'Ahmedabad', rating: 4 },
        { name: 'Sterling Wilson', category: 'Structure', contact: 'Anil Gupta', phone: '+91 98765 43214', email: 'info@sterlingwilson.com', city: 'Pune', rating: 4 },
      ];
      for (const vendor of sampleVendors) {
        await procurementService.createVendor(vendor, 'default');
      }
      console.log('✓ Seeded 5 procurement vendors');
    }
  } catch (err: any) {
    console.log('Vendor seed skipped:', err.message);
  }
}

void bootstrap();
