import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './common/config/config.loader';
import { DatabaseModule } from './common/database/database.module';
import { ExportModule } from './common/export/export.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './inventory/vehicles/vehicles.module';
import { BrandsModule } from './catalog/brands/brands.module';
import { CustomersModule } from './sales/customers/customers.module';
import { OrdersModule } from './sales/orders/orders.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig], ignoreEnvFile: true }),
    DatabaseModule,
    ExportModule,
    NotificationsModule,
    AuthModule,
    VehiclesModule,
    BrandsModule,
    CustomersModule,
    OrdersModule,
    ReportsModule,
  ],
})
export class AppModule {}
