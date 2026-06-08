import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../common/database/repository.tokens';
import type { IOrderRepository } from './order.repository.interface';
import type { CreateOrderDto, AddPaymentDto, QueryOrderDto } from './dto/order.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(tenantId: string, query: QueryOrderDto) { return this.repo.findAll(tenantId, query); }
  findOne(tenantId: string, id: string) { return this.repo.findById(tenantId, id); }
  getSummary(tenantId: string, branchId?: string) { return this.repo.getSummary(tenantId, branchId); }

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
    const order = await this.repo.create(tenantId, userId, dto);
    // Thông báo cho Manager phê duyệt
    await this.notifications.sendToRole({
      tenantId, role: 'SALES_MANAGER', type: 'order_created',
      title: 'Đơn hàng mới cần phê duyệt',
      body: `Đơn ${order.orderNumber} — ${Number(order.finalPrice).toLocaleString('vi-VN')} ₫`,
      data: { orderId: order.id },
    });
    return order;
  }

  confirm(tenantId: string, id: string, userId: string) { return this.repo.confirm(tenantId, id, userId); }

  async approve(tenantId: string, id: string, userId: string) {
    const order = await this.repo.approve(tenantId, id, userId);
    if (order.salespersonId) {
      await this.notifications.send({
        tenantId, userId: order.salespersonId, type: 'order_approved',
        title: 'Đơn hàng được phê duyệt',
        body: `Đơn ${order.orderNumber} đã được phê duyệt — có thể tiến hành bàn giao`,
        data: { orderId: order.id },
      });
    }
    return order;
  }

  async deliver(tenantId: string, id: string, userId: string) {
    const order = await this.repo.deliver(tenantId, id, userId);
    if (order.salespersonId) {
      await this.notifications.send({
        tenantId, userId: order.salespersonId, type: 'order_delivered',
        title: 'Bàn giao xe thành công',
        body: `Đơn ${order.orderNumber} đã bàn giao — doanh số được ghi nhận`,
        data: { orderId: order.id },
      });
    }
    return order;
  }

  async cancel(tenantId: string, id: string, userId: string, reason?: string) {
    const order = await this.repo.cancel(tenantId, id, userId, reason);
    if (order.salespersonId) {
      await this.notifications.send({
        tenantId, userId: order.salespersonId, type: 'order_cancelled',
        title: 'Đơn hàng bị hủy',
        body: `Đơn ${order.orderNumber} đã bị hủy${reason ? ': ' + reason : ''}`,
        data: { orderId: order.id },
      });
    }
    return order;
  }

  async addPayment(tenantId: string, orderId: string, userId: string, dto: AddPaymentDto) {
    const payment = await this.repo.addPayment(tenantId, orderId, userId, dto);
    const order = await this.repo.findById(tenantId, orderId);
    if (order?.salespersonId) {
      await this.notifications.send({
        tenantId, userId: order.salespersonId, type: 'payment_received',
        title: 'Thanh toán mới',
        body: `${Number(dto.amount).toLocaleString('vi-VN')} ₫ — đơn ${order.orderNumber}`,
        data: { orderId, paymentId: payment.id },
      });
    }
    return payment;
  }
}
