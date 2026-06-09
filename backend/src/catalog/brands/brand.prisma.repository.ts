import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { IBrandRepository } from './brand.repository.interface';

@Injectable()
export class BrandPrismaRepository implements IBrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { models: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.brand.findFirst({
      where: { id, tenantId },
      include: { models: { include: { variants: true } } },
    });
  }

  create(tenantId: string, data: { name: string; country?: string; logoUrl?: string }) {
    return this.prisma.brand.create({ data: { ...data, tenantId } });
  }

  async update(tenantId: string, id: string, data: { name?: string; country?: string; logoUrl?: string; isActive?: boolean }) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException('Không tìm thấy hãng xe');
    return this.prisma.brand.update({ where: { id }, data });
  }

  findModels(tenantId: string, brandId: string) {
    return this.prisma.model.findMany({
      where: { brandId, brand: { tenantId }, isActive: true },
      include: { _count: { select: { variants: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async softDelete(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException('Không tìm thấy hãng xe');
    return this.prisma.brand.update({ where: { id }, data: { isActive: false } });
  }
}
