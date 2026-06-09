import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Global search — tìm kiếm xuyên suốt vehicles, customers, orders
   * SQLite: dùng contains (LIKE). PostgreSQL: có thể mở rộng sang full-text search.
   */
  async globalSearch(tenantId: string, q: string, limit = 5) {
    if (!q || q.length < 2) return { vehicles: [], customers: [], orders: [] };
    const kw = q.trim();

    const [vehicles, customers, orders] = await Promise.all([
      this.searchVehicles(tenantId, kw, limit),
      this.searchCustomers(tenantId, kw, limit),
      this.searchOrders(tenantId, kw, limit),
    ]);

    return { vehicles, customers, orders, keyword: kw };
  }

  private searchVehicles(tenantId: string, q: string, limit: number) {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
        OR: [
          { vin: { contains: q } },
          { plateNumber: { contains: q } },
          { variant: { model: { name: { contains: q } } } },
          { variant: { model: { brand: { name: { contains: q } } } } },
          { variant: { trimLevel: { contains: q } } },
          { lotLocation: { contains: q } },
        ],
      },
      select: {
        id: true, vin: true, plateNumber: true, status: true, condition: true,
        sellingPrice: true,
        variant: { select: { year: true, trimLevel: true, model: { select: { name: true, brand: { select: { name: true } } } } } },
        branch: { select: { name: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  private searchCustomers(tenantId: string, q: string, limit: number) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { idNumber: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, phone: true, email: true, type: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  private searchOrders(tenantId: string, q: string, limit: number) {
    return this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        OR: [
          { orderNumber: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { vehicle: { vin: { contains: q } } },
        ],
      },
      select: {
        id: true, orderNumber: true, status: true, finalPrice: true, createdAt: true,
        customer: { select: { fullName: true, phone: true } },
        vehicle: { select: { vin: true, variant: { select: { model: { select: { name: true, brand: { select: { name: true } } } } } } } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tìm kiếm xe nâng cao với nhiều filter */
  async advancedVehicleSearch(tenantId: string, params: {
    q?: string;
    brandId?: string;
    modelId?: string;
    yearFrom?: number;
    yearTo?: number;
    priceFrom?: number;
    priceTo?: number;
    condition?: string;
    status?: string;
    branchId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const { q, brandId, modelId, yearFrom, yearTo, priceFrom, priceTo,
      condition, status, branchId, cursor, limit = 20 } = params;

    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (condition) where.condition = condition;
    if (status) where.status = status;
    if (priceFrom || priceTo) {
      where.sellingPrice = {};
      if (priceFrom) where.sellingPrice.gte = priceFrom;
      if (priceTo) where.sellingPrice.lte = priceTo;
    }
    if (brandId) where.variant = { model: { brandId } };
    if (modelId) where.variant = { ...where.variant, modelId };
    if (yearFrom || yearTo) {
      where.variant = {
        ...where.variant,
        year: {
          ...(yearFrom ? { gte: yearFrom } : {}),
          ...(yearTo ? { lte: yearTo } : {}),
        },
      };
    }
    if (q) {
      where.OR = [
        { vin: { contains: q } },
        { plateNumber: { contains: q } },
        { variant: { model: { name: { contains: q } } } },
        { variant: { model: { brand: { name: { contains: q } } } } },
      ];
    }

    const items = await this.prisma.vehicle.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        variant: { include: { model: { include: { brand: true } } } },
        exteriorColor: true,
        branch: true,
      },
    });

    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    return {
      data,
      nextCursor: hasNext ? data[data.length - 1].id : null,
      total: data.length,
    };
  }
}
