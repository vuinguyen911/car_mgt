import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { ICustomerRepository } from './customer.repository.interface';
import type { CreateCustomerDto, QueryCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomerPrismaRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryCustomerDto) {
    const { search, province, type, cursor, take = 50 } = query;
    const where: any = { tenantId };
    if (province) where.province = province;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search } },
      ];
    }

    const items = await this.prisma.customer.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { salesOrders: true } } },
    });

    const hasMore = items.length > take;
    const result = hasMore ? items.slice(0, take) : items;
    return { items: result, nextCursor: hasMore ? result[result.length - 1].id : null, hasMore };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        salesOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { vehicle: { include: { variant: { include: { model: { include: { brand: true } } } } } } },
        },
      },
    });
  }

  create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        type: dto.type ?? 'individual',
        fullName: dto.fullName,
        idNumber: dto.idNumber,
        taxCode: dto.taxCode,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        province: dto.province,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        gender: dto.gender,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCustomerDto>) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.type && { type: dto.type }),
        ...(dto.idNumber !== undefined && { idNumber: dto.idNumber }),
        ...(dto.taxCode !== undefined && { taxCode: dto.taxCode }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.dob !== undefined && { dob: new Date(dto.dob!) }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    await this.prisma.customer.delete({ where: { id } });
  }

  search(tenantId: string, q: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, phone: true, type: true },
      take: 10,
    });
  }
}
