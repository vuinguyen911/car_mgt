import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { loadConfig } from './common/config/config.loader';
import { DatabaseModule } from './common/database/database.module';
import { ExportModule } from './common/export/export.module';
import { AppCacheModule } from './common/cache/cache.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './inventory/vehicles/vehicles.module';
import { BrandsModule } from './catalog/brands/brands.module';
import { CustomersModule } from './sales/customers/customers.module';
import { OrdersModule } from './sales/orders/orders.module';
import { ReportsModule } from './reports/reports.module';
import { ImportModule } from './import/import.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig], ignoreEnvFile: true }),

    // BullMQ root — kết nối Redis; lazyConnect để không crash khi Redis chưa chạy
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6379,
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db') ?? 0,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        },
      }),
    }),

    ScheduleModule.forRoot(),
    AppCacheModule,
    DatabaseModule,
    ExportModule,
    NotificationsModule,
    GatewayModule,
    AuthModule,
    VehiclesModule,
    BrandsModule,
    CustomersModule,
    OrdersModule,
    ReportsModule,
    ImportModule,
    SearchModule,
    HealthModule,
    TasksModule,
  ],
})
export class AppModule {}
