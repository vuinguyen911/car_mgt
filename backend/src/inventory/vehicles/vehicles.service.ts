import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { VEHICLE_REPOSITORY } from '../../common/database/repository.tokens';
import type { IVehicleRepository } from './vehicle.repository.interface';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';

/**
 * Service không biết gì về Prisma, MySQL hay bất kỳ DB cụ thể nào.
 * Chỉ gọi qua IVehicleRepository interface.
 * Để swap DB: đổi provider trong VehiclesModule, service này không đổi.
 */
@Injectable()
export class VehiclesService {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepo: IVehicleRepository,
  ) {}

  findAll(tenantId: string, query: QueryVehicleDto) {
    return this.vehicleRepo.findAll(tenantId, query);
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.vehicleRepo.findById(tenantId, id);
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
    return vehicle;
  }

  create(tenantId: string, userId: string, dto: CreateVehicleDto) {
    return this.vehicleRepo.create(tenantId, userId, dto);
  }

  update(tenantId: string, id: string, userId: string, dto: Partial<CreateVehicleDto>) {
    return this.vehicleRepo.update(tenantId, id, userId, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.vehicleRepo.delete(tenantId, id);
    return { message: 'Đã xóa xe' };
  }

  getStats(tenantId: string, branchId?: string) {
    return this.vehicleRepo.getStats(tenantId, branchId);
  }
}
