import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehicleStatus } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryVehicleDto) {
    const { search, branchId, variantId, status, condition, cursor, take = 50, sortBy = 'createdAt', sortDir = 'desc' } = query;

    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (variantId) where.variantId = variantId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (search) {
      where.OR = [
        { vin: { contains: search, mode: 'insensitive' } },
        { plateNumber: { contains: search, mode: 'insensitive' } },
        { variant: { model: { name: { contains: search, mode: 'insensitive' } } } },
        { variant: { model: { brand: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { [sortBy]: sortDir },
      select: {
        id: true, vin: true, plateNumber: true, condition: true, status: true,
        odometerKm: true, sellingPrice: true, lotLocation: true, createdAt: true,
        variant: {
          select: {
            year: true, trimLevel: true, transmission: true, engineType: true,
            model: { select: { name: true, segment: true, brand: { select: { name: true } } } },
          },
        },
        exteriorColor: { select: { name: true, hexCode: true } },
        branch: { select: { id: true, name: true, city: true } },
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
      },
    });

    const hasMore = vehicles.length > take;
    const items = hasMore ? vehicles.slice(0, take) : vehicles;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
      include: {
        variant: { include: { model: { include: { brand: true } } } },
        exteriorColor: true,
        branch: true,
        images: { orderBy: { sortOrder: 'asc' } },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(tenantId: string, userId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { vin: dto.vin } });
    if (existing) throw new ConflictException(`VIN ${dto.vin} already exists`);

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
      include: { variant: { include: { model: { include: { brand: true } } } } },
    });

    return vehicle;
  }

  async update(tenantId: string, userId: string, id: string, dto: Partial<CreateVehicleDto>) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

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
      });

      if (dto.status && dto.status !== vehicle.status) {
        await tx.vehicleStatusLog.create({
          data: {
            vehicleId: id,
            fromStatus: vehicle.status,
            toStatus: dto.status,
            changedBy: userId,
          },
        });
      }

      return v;
    });

    return updated;
  }

  async remove(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status === VehicleStatus.SOLD) {
      throw new ForbiddenException('Cannot delete a sold vehicle');
    }
    await this.prisma.vehicle.delete({ where: { id } });
    return { message: 'Vehicle deleted' };
  }

  async getStats(tenantId: string, branchId?: string) {
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
