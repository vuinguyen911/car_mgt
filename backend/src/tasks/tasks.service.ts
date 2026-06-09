import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/database/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private gateway: AppGateway,
  ) {}

  /**
   * Mỗi ngày 8:00 sáng — Kiểm tra xe tồn kho quá 90 ngày (cảnh báo aging)
   */
  @Cron('0 8 * * *', { name: 'aging-alert' })
  async agingAlertJob() {
    this.logger.log('[CRON] Chạy kiểm tra xe tồn kho lâu...');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const agingVehicles = await this.prisma.vehicle.groupBy({
        by: ['tenantId'],
        where: {
          status: 'AVAILABLE',
          importDate: { lte: ninetyDaysAgo },
        },
        _count: { id: true },
      });

      for (const group of agingVehicles) {
        if (group._count.id === 0) continue;

        const count = group._count.id;
        const notification = await this.prisma.notification.create({
          data: {
            tenantId: group.tenantId,
            userId: await this.getFirstAdminId(group.tenantId),
            type: 'AGING_ALERT',
            title: `⚠️ Cảnh báo tồn kho lâu`,
            body: `Có ${count} xe tồn kho quá 90 ngày chưa bán. Cần kiểm tra và xử lý.`,
            data: { count, type: 'aging', daysThreshold: 90 } as any,
          },
        });

        this.gateway.emitToTenant(group.tenantId, 'notification:new', {
          id: String(notification.id),
          type: 'AGING_ALERT',
          title: notification.title,
          body: notification.body,
          count,
        });

        this.logger.log(`[CRON] Aging alert: ${count} xe cho tenant ${group.tenantId}`);
      }
    } catch (err: any) {
      this.logger.error(`[CRON] Lỗi aging alert: ${err.message}`);
    }
  }

  /**
   * Mỗi ngày 9:00 sáng — Kiểm tra tồn kho ít xe (< 5 xe mỗi hãng)
   */
  @Cron('0 9 * * *', { name: 'low-stock-alert' })
  async lowStockAlertJob() {
    this.logger.log('[CRON] Chạy kiểm tra tồn kho thấp...');
    try {
      const tenants = await this.prisma.tenant.findMany({ where: { isActive: true }, select: { id: true } });

      for (const tenant of tenants) {
        const brands = await this.prisma.brand.findMany({
          where: { tenantId: tenant.id, isActive: true },
          include: {
            models: {
              include: {
                variants: {
                  include: {
                    vehicles: {
                      where: { tenantId: tenant.id, status: 'AVAILABLE' },
                    },
                  },
                },
              },
            },
          },
        });

        const lowStockBrands = brands
          .map(b => {
            const count = b.models.flatMap(m => m.variants.flatMap(v => v.vehicles)).length;
            return { name: b.name, count };
          })
          .filter(b => b.count > 0 && b.count < 5);

        if (lowStockBrands.length > 0) {
          const adminId = await this.getFirstAdminId(tenant.id);
          const summary = lowStockBrands.map(b => `${b.name}: ${b.count} xe`).join(', ');

          const notification = await this.prisma.notification.create({
            data: {
              tenantId: tenant.id,
              userId: adminId,
              type: 'LOW_STOCK',
              title: '📦 Tồn kho thấp',
              body: `Các hãng xe sắp hết hàng: ${summary}`,
              data: { brands: lowStockBrands } as any,
            },
          });

          this.gateway.emitToTenant(tenant.id, 'notification:new', {
            id: String(notification.id),
            type: 'LOW_STOCK',
            title: notification.title,
            body: notification.body,
            brands: lowStockBrands,
          });

          this.logger.log(`[CRON] Low stock: ${lowStockBrands.length} hãng cho tenant ${tenant.id}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[CRON] Lỗi low stock: ${err.message}`);
    }
  }

  /**
   * Mỗi đêm 2:00 — Xóa cache cũ để refresh dữ liệu ngày mới
   */
  @Cron('0 2 * * *', { name: 'cache-cleanup' })
  async cacheCleanupJob() {
    this.logger.log('[CRON] Dọn dẹp cache...');
    try {
      await this.cache.invalidatePattern('reports:*');
      await this.cache.invalidatePattern('stats:*');
      this.logger.log('[CRON] Cache đã được làm sạch');
    } catch (err: any) {
      this.logger.error(`[CRON] Lỗi dọn cache: ${err.message}`);
    }
  }

  /**
   * Mỗi Chủ nhật 23:00 — Dọn audit logs cũ hơn 90 ngày
   */
  @Cron('0 23 * * 0', { name: 'audit-cleanup' })
  async auditCleanupJob() {
    this.logger.log('[CRON] Dọn dẹp audit logs cũ...');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const result = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });
      this.logger.log(`[CRON] Đã xóa ${result.count} audit log cũ`);
    } catch (err: any) {
      this.logger.error(`[CRON] Lỗi dọn audit: ${err.message}`);
    }
  }

  private async getFirstAdminId(tenantId: string): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });
    // Fallback — lấy bất kỳ user nào
    if (!admin) {
      const anyUser = await this.prisma.user.findFirst({
        where: { tenantId, isActive: true },
        select: { id: true },
      });
      return anyUser?.id ?? '';
    }
    return admin.id;
  }
}
