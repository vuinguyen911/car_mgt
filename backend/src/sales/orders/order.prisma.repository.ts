import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { IOrderRepository } from './order.repository.interface';
import type { CreateOrderDto, AddPaymentDto, QueryOrderDto } from './dto/order.dto';
import { VehicleStatus, OrderStatus } from '@prisma/client';

const ORDER_INCLUDE = {
  vehicle: {
    include: {
      variant: { include: { model: { include: { brand: true } } } },
      exteriorColor: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
  },
  customer: { select: { id: true, fullName: true, phone: true, email: true } },
  salesperson: { select: { id: true, fullName: true, email: true } },
  branch: { select: { id: true, name: true, city: true } },
  payments: { orderBy: { paidAt: 'desc' as const } },
};

@Injectable()
export class OrderPrismaRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryOrderDto) {
    const { search, status, branchId, salespersonId, dateFrom, dateTo, cursor, take = 50 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (salespersonId) where.salespersonId = salespersonId;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { vehicle: { vin: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const items = await this.prisma.salesOrder.findMany({
      where, take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { include: { variant: { include: { model: { include: { brand: true } } } } } },
        customer: { select: { id: true, fullName: true, phone: true } },
        salesperson: { select: { id: true, fullName: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
    });

    const hasMore = items.length > take;
    const result = hasMore ? items.slice(0, take) : items;
    return { items: result, nextCursor: hasMore ? result[result.length - 1].id : null, hasMore };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.salesOrder.findFirst({ where: { id, tenantId }, include: ORDER_INCLUDE });
  }

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, tenantId } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException(`Xe đang ở trạng thái ${vehicle.status}, không thể tạo đơn hàng`);
    }

    // Tạo số đơn hàng tự động: SO-YYYYMM-XXXXX
    const count = await this.prisma.salesOrder.count({ where: { tenantId } });
    const now = new Date();
    const orderNumber = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          tenantId,
          branchId: dto.branchId ?? vehicle.branchId,
          orderNumber,
          vehicleId: dto.vehicleId,
          customerId: dto.customerId,
          salespersonId: userId,
          status: OrderStatus.DRAFT,
          listPrice: dto.listPrice,
          discountAmount: dto.discountAmount ?? 0,
          finalPrice: dto.finalPrice,
          paymentMethod: dto.paymentMethod,
          depositAmount: dto.depositAmount ?? 0,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          notes: dto.notes,
        },
        include: ORDER_INCLUDE,
      });

      // Reserve xe khi tạo đơn
      await tx.vehicle.update({ where: { id: dto.vehicleId }, data: { status: VehicleStatus.RESERVED } });
      await tx.vehicleStatusLog.create({
        data: { vehicleId: dto.vehicleId, fromStatus: VehicleStatus.AVAILABLE, toStatus: VehicleStatus.RESERVED, changedBy: userId, note: `Đơn hàng ${orderNumber}` },
      });

      return order;
    });
  }

  async confirm(tenantId: string, id: string, userId: string) {
    return this._transition(tenantId, id, userId, [OrderStatus.DRAFT], OrderStatus.CONFIRMED);
  }

  async approve(tenantId: string, id: string, userId: string) {
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: OrderStatus.PAID, approvedBy: userId, approvedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  async deliver(tenantId: string, id: string, userId: string) {
    const order = await this._transition(tenantId, id, userId, [OrderStatus.CONFIRMED, OrderStatus.PAID], OrderStatus.DELIVERED);
    await this.prisma.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.SOLD } });
    await this.prisma.vehicleStatusLog.create({
      data: { vehicleId: order.vehicleId, fromStatus: VehicleStatus.RESERVED, toStatus: VehicleStatus.SOLD, changedBy: userId, note: `Bàn giao theo đơn ${order.orderNumber}` },
    });
    return order;
  }

  async cancel(tenantId: string, id: string, userId: string, reason?: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status === OrderStatus.DELIVERED) throw new ForbiddenException('Không thể hủy đơn đã bàn giao');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, notes: reason ? `[Hủy] ${reason}` : order.notes },
        include: ORDER_INCLUDE,
      });
      // Trả xe về AVAILABLE nếu chưa bàn giao
      if (order.status !== OrderStatus.DELIVERED) {
        await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.AVAILABLE } });
        await tx.vehicleStatusLog.create({
          data: { vehicleId: order.vehicleId, fromStatus: VehicleStatus.RESERVED, toStatus: VehicleStatus.AVAILABLE, changedBy: userId, note: `Hủy đơn ${order.orderNumber}` },
        });
      }
      return updated;
    });
  }

  async addPayment(tenantId: string, orderId: string, userId: string, dto: AddPaymentDto) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Đơn hàng đã hủy');

    const payment = await this.prisma.payment.create({
      data: { orderId, amount: dto.amount, method: dto.method, referenceNo: dto.referenceNo, paidAt: new Date(), receivedBy: userId, note: dto.note },
    });

    // Kiểm tra đã thanh toán đủ chưa → tự động chuyển PAID
    const payments = await this.prisma.payment.findMany({ where: { orderId } });
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    if (totalPaid >= Number(order.finalPrice) && order.status === OrderStatus.CONFIRMED) {
      await this.prisma.salesOrder.update({ where: { id: orderId }, data: { status: OrderStatus.PAID } });
    }

    return payment;
  }

  async getSummary(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [byStatus, todayOrders, monthOrders] = await Promise.all([
      this.prisma.salesOrder.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.salesOrder.aggregate({ where: { ...where, createdAt: { gte: today } }, _count: true, _sum: { finalPrice: true } }),
      this.prisma.salesOrder.aggregate({ where: { ...where, status: { not: OrderStatus.CANCELLED }, createdAt: { gte: monthStart } }, _count: true, _sum: { finalPrice: true } }),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      today: { orders: todayOrders._count, revenue: todayOrders._sum.finalPrice ?? 0 },
      monthToDate: { orders: monthOrders._count, revenue: monthOrders._sum.finalPrice ?? 0 },
    };
  }

  private async _transition(tenantId: string, id: string, userId: string, fromStatuses: OrderStatus[], toStatus: OrderStatus) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!fromStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException(`Không thể chuyển từ trạng thái ${order.status}`);
    }
    return this.prisma.salesOrder.update({ where: { id }, data: { status: toStatus }, include: ORDER_INCLUDE });
  }
}
