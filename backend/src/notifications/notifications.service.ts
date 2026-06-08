import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

export type NotificationType =
  | 'order_created' | 'order_approved' | 'order_delivered' | 'order_cancelled'
  | 'stock_low' | 'vehicle_aging' | 'payment_received';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(opts: { tenantId: string; userId: string; type: NotificationType; title: string; body: string; data?: Record<string, any> }) {
    return this.prisma.notification.create({
      data: {
        tenantId: opts.tenantId,
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
      },
    });
  }

  async sendToRole(opts: { tenantId: string; role: string; type: NotificationType; title: string; body: string; data?: Record<string, any> }) {
    const users = await this.prisma.user.findMany({
      where: { tenantId: opts.tenantId, role: opts.role as any, isActive: true },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId: opts.tenantId,
        userId: u.id,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
      })),
    });
  }

  findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { userId, ...(id === 'all' ? {} : { id }) },
      data: { isRead: true },
    });
  }
}
