import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { IVehicleRepository, VehicleDetail, VehicleItem, VehicleStats } from './vehicle.repository.interface';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';

const VEHICLE_LIST_SELECT = {
  id: true, vin: true, plateNumber: true, condition: true, status: true,
  odometerKm: true, sellingPrice: true, lotLocation: true, createdAt: true,
  variant: {
    select: {
      year: true, trimLevel: true, engineType: true, transmission: true,
      model: { select: { name: true, segment: true, brand: { select: { name: true } } } },
    },
  },
  exteriorColor: { select: { name: true, hexCode: true } },
  branch: { select: { id: true, name: true, city: true } },
  images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
} as const;

const VEHICLE_DETAIL_INCLUDE = {
  variant: { include: { model: { include: { brand: true } } } },
  exteriorColor: true,
  branch: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  statusLogs: { orderBy: { createdAt: 'desc' as const }, take: 10 },
};

@Injectable()
export class VehiclePrismaRepository implements IVehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryVehicleDto) {
    const { search, branchId, variantId, status, condition, cursor, take = 50, sortBy = 'createdAt', sortDir = 'desc' } = query;

    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (variantId) where.variantId = variantId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (search) {
      where.OR = [
        { vin: { contains: search } },
        { plateNumber: { contains: search } },
        { variant: { model: { name: { contains: search } } } },
        { variant: { model: { brand: { name: { contains: search } } } } },
      ];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { [sortBy]: sortDir },
      select: VEHICLE_LIST_SELECT,
    });

    const hasMore = vehicles.length > take;
    const items = hasMore ? vehicles.slice(0, take) : vehicles;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items: items as VehicleItem[], nextCursor, hasMore };
  }

  async findById(tenantId: string, id: string): Promise<VehicleDetail | null> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
      include: VEHICLE_DETAIL_INCLUDE,
    });
    return vehicle as VehicleDetail | null;
  }

  async create(tenantId: string, userId: string, dto: CreateVehicleDto): Promise<VehicleDetail> {
    const existing = await this.prisma.vehicle.findUnique({ where: { vin: dto.vin } });
    if (existing) throw new ConflictException(`VIN ${dto.vin} đã tồn tại trong hệ thống`);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        variantId: dto.variantId,
        exteriorColorId: dto.exteriorColorId,
        vin: dto.vin,
        plateNumber: dto.plateNumber,
        engineNumber: dto.engineNumber,
        chassisNumber: dto.chassisNumber,
        interiorColor: dto.interiorColor,
        condition: dto.condition,
        status: dto.status,
        odometerKm: dto.odometerKm,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        minPrice: dto.minPrice,
        lotLocation: dto.lotLocation,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
        importDate: dto.importDate ? new Date(dto.importDate) : undefined,
        notes: dto.notes,
        statusLogs: {
          create: { toStatus: dto.status ?? 'AVAILABLE', changedBy: userId, note: 'Xe nhập kho' },
        },
      },
      include: VEHICLE_DETAIL_INCLUDE,
    });

    return vehicle as VehicleDetail;
  }

  async update(tenantId: string, id: string, userId: string, dto: Partial<CreateVehicleDto>): Promise<VehicleDetail> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    const updated = await this.prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: {
          ...(dto.branchId !== undefined && { branchId: dto.branchId }),
          ...(dto.exteriorColorId !== undefined && { exteriorColorId: dto.exteriorColorId }),
          ...(dto.plateNumber !== undefined && { plateNumber: dto.plateNumber }),
          ...(dto.interiorColor !== undefined && { interiorColor: dto.interiorColor }),
          ...(dto.condition !== undefined && { condition: dto.condition }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.odometerKm !== undefined && { odometerKm: dto.odometerKm }),
          ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
          ...(dto.minPrice !== undefined && { minPrice: dto.minPrice }),
          ...(dto.lotLocation !== undefined && { lotLocation: dto.lotLocation }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: VEHICLE_DETAIL_INCLUDE,
      });

      if (dto.status && dto.status !== vehicle.status) {
        await tx.vehicleStatusLog.create({
          data: { vehicleId: id, fromStatus: vehicle.status, toStatus: dto.status, changedBy: userId },
        });
      }

      return v;
    });

    return updated as VehicleDetail;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
    if (vehicle.status === VehicleStatus.SOLD) throw new ForbiddenException('Không thể xóa xe đã bán');
    await this.prisma.vehicle.delete({ where: { id } });
  }

  async getStats(tenantId: string, branchId?: string): Promise<VehicleStats> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const [total, byStatus, byCondition] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.vehicle.groupBy({ by: ['condition'], where, _count: true }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byCondition: Object.fromEntries(byCondition.map((c) => [c.condition, c._count])),
    };
  }
}
