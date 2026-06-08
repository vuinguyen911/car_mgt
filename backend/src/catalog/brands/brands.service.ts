import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { models: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(tenantId: string, id: string) {
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
    if (!brand) throw new NotFoundException('Brand not found');
    return this.prisma.brand.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return this.prisma.brand.update({ where: { id }, data: { isActive: false } });
  }
}
