import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclePrismaRepository } from './vehicle.prisma.repository';
import { VEHICLE_REPOSITORY } from '../../common/database/repository.tokens';

/**
 * Để swap DB: thay VehiclePrismaRepository bằng VehicleMysqlRepository (hoặc bất kỳ class nào
 * implements IVehicleRepository), không cần chỉnh VehiclesService hay VehiclesController.
 *
 * Ví dụ swap sang MySQL:
 *   { provide: VEHICLE_REPOSITORY, useClass: VehicleMysqlRepository }
 */
@Module({
  providers: [
    { provide: VEHICLE_REPOSITORY, useClass: VehiclePrismaRepository },
    VehiclePrismaRepository,
    VehiclesService,
  ],
  controllers: [VehiclesController],
})
export class VehiclesModule {}
