/**
 * TestAppFactory — khởi động NestJS app với SQLite test database.
 *
 * Chiến lược:
 *  - Dùng DATABASE_URL = file:./test.db (SQLite riêng)
 *  - Mock BullMQ / Redis để test không cần Redis chạy
 *  - Mỗi file test gọi createTestApp() + closeTestApp()
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// Chỉ import các module cần thiết cho tests, bỏ BullMQ / WebSocket / Redis
import { DatabaseModule } from '../../src/common/database/database.module';
import { AuthModule } from '../../src/auth/auth.module';
import { VehiclesModule } from '../../src/inventory/vehicles/vehicles.module';
import { BrandsModule } from '../../src/catalog/brands/brands.module';
import { CustomersModule } from '../../src/sales/customers/customers.module';
import { OrdersModule } from '../../src/sales/orders/orders.module';
import { NotificationsModule } from '../../src/notifications/notifications.module';
import { HealthModule } from '../../src/health/health.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';

export const TEST_DB_PATH = path.join(__dirname, '../../test-e2e.db');
export const TEST_DB_URL  = `file:${TEST_DB_PATH}`;

/** Seed dữ liệu cơ bản (tenant, branch, admin user) */
export async function seedTestData(prisma: PrismaClient) {
  const bcrypt = await import('bcryptjs');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    create: { name: 'Test Auto', slug: 'test-tenant' },
    update: {},
  });

  const branch = await (prisma as any).branch.upsert({
    where: { id: 'branch-test-1' },
    create: { id: 'branch-test-1', tenantId: tenant.id, name: 'Test Branch HCM', city: 'Hồ Chí Minh' },
    update: {},
  }).catch(() =>
    (prisma as any).branch.findFirst({ where: { tenantId: tenant.id } })
  );

  const hash = await bcrypt.hash('Test@1234', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'test-admin@auto.com' },
    create: {
      email: 'test-admin@auto.com',
      passwordHash: hash,
      fullName: 'Test Admin',
      role: 'ADMIN',
      tenantId: tenant.id,
      branchId: branch?.id ?? null,
      isActive: true,
    },
    update: { passwordHash: hash, isActive: true },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'test-sales@auto.com' },
    create: {
      email: 'test-sales@auto.com',
      passwordHash: hash,
      fullName: 'Test Sales',
      role: 'SALES_STAFF',
      tenantId: tenant.id,
      branchId: branch?.id ?? null,
      isActive: true,
    },
    update: { passwordHash: hash, isActive: true },
  });

  return { tenant, branch, adminUser, salesUser };
}

/** Khởi tạo NestJS app cho e2e test */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaClient;
}> {
  // Set env trước khi module load
  process.env.DATABASE_URL  = TEST_DB_URL;
  process.env.JWT_SECRET         = 'test-jwt-secret-e2e-12345';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-e2e-12345';
  process.env.JWT_EXPIRES_IN     = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.NODE_ENV           = 'test';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          app: { port: 3099, prefix: 'api/v1', cors_origin: '*' },
          jwt: {
            secret: 'test-jwt-secret-e2e-12345',
            refresh_secret: 'test-refresh-secret-e2e-12345',
            expires_in: '1h',
            refresh_expires_in: '7d',
          },
          redis: { host: 'localhost', port: 6379 },
        })],
        ignoreEnvFile: true,
      }),
      DatabaseModule,
      NotificationsModule,
      AuthModule,
      VehiclesModule,
      BrandsModule,
      CustomersModule,
      OrdersModule,
      HealthModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  // Prisma trực tiếp cho assertions
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
  await prisma.$connect();

  return { app, prisma };
}

export async function closeTestApp(app: INestApplication, prisma: PrismaClient) {
  await prisma.$disconnect();
  await app.close();
}
