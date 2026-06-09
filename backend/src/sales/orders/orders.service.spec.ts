import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ORDER_REPOSITORY } from '../../common/database/repository.tokens';
import type { IOrderRepository } from './order.repository.interface';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const tenantId  = 'tenant-1';
const userId    = 'user-seller-1';
const managerId = 'user-manager-1';
const orderId   = 'order-uuid-1';

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: orderId,
    orderNumber: 'ORD-2024-001',
    tenantId,
    status: 'DRAFT',
    salespersonId: userId,
    finalPrice: 800_000_000,
    ...overrides,
  };
}

function makeRepo(): jest.Mocked<IOrderRepository> {
  return {
    findAll:    jest.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    findById:   jest.fn().mockResolvedValue(makeOrder()),
    create:     jest.fn().mockResolvedValue(makeOrder()),
    confirm:    jest.fn().mockResolvedValue(makeOrder({ status: 'CONFIRMED' })),
    approve:    jest.fn().mockResolvedValue(makeOrder({ status: 'CONFIRMED' })),
    deliver:    jest.fn().mockResolvedValue(makeOrder({ status: 'DELIVERED' })),
    cancel:     jest.fn().mockResolvedValue(makeOrder({ status: 'CANCELLED' })),
    addPayment: jest.fn().mockResolvedValue({ id: 'pay-1', amount: 100_000_000 }),
    getSummary: jest.fn().mockResolvedValue({ totalOrders: 10, totalRevenue: 5_000_000_000 }),
  };
}

function makeNotifications(): jest.Mocked<Pick<NotificationsService, 'send' | 'sendToRole'>> {
  return {
    send:       jest.fn().mockResolvedValue(undefined),
    sendToRole: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('OrdersService', () => {
  let service: OrdersService;
  let repo: jest.Mocked<IOrderRepository>;
  let notifications: ReturnType<typeof makeNotifications>;

  beforeEach(async () => {
    repo          = makeRepo();
    notifications = makeNotifications();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDER_REPOSITORY,      useValue: repo },
        { provide: NotificationsService,  useValue: notifications },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('tạo đơn và gửi thông báo đến SALES_MANAGER', async () => {
      const dto = { vehicleId: 'v-1', customerId: 'c-1', finalPrice: 800_000_000 };
      const result = await service.create(tenantId, userId, dto as any);

      expect(result.orderNumber).toBe('ORD-2024-001');
      expect(repo.create).toHaveBeenCalledWith(tenantId, userId, dto);
      expect(notifications.sendToRole).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'SALES_MANAGER', type: 'order_created' }),
      );
    });

    it('thông báo chứa số đơn và giá trị trong body', async () => {
      await service.create(tenantId, userId, {} as any);
      expect(notifications.sendToRole).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('ORD-2024-001') }),
      );
    });
  });

  // ── confirm ────────────────────────────────────────────────────────────────
  describe('confirm()', () => {
    it('chuyển trạng thái sang CONFIRMED', async () => {
      const result = await service.confirm(tenantId, orderId, managerId);
      expect(result.status).toBe('CONFIRMED');
      expect(repo.confirm).toHaveBeenCalledWith(tenantId, orderId, managerId);
    });
  });

  // ── approve ────────────────────────────────────────────────────────────────
  describe('approve()', () => {
    it('phê duyệt đơn và thông báo salesperson', async () => {
      repo.approve.mockResolvedValue(makeOrder({ status: 'CONFIRMED', salespersonId: userId }));
      await service.approve(tenantId, orderId, managerId);

      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId, type: 'order_approved' }),
      );
    });

    it('không gửi thông báo nếu đơn không có salesperson', async () => {
      repo.approve.mockResolvedValue(makeOrder({ salespersonId: null }));
      await service.approve(tenantId, orderId, managerId);
      expect(notifications.send).not.toHaveBeenCalled();
    });
  });

  // ── deliver ────────────────────────────────────────────────────────────────
  describe('deliver()', () => {
    it('chuyển trạng thái DELIVERED và thông báo bàn giao', async () => {
      repo.deliver.mockResolvedValue(makeOrder({ status: 'DELIVERED', salespersonId: userId }));
      const result = await service.deliver(tenantId, orderId, userId);

      expect(result.status).toBe('DELIVERED');
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'order_delivered' }),
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────
  describe('cancel()', () => {
    it('hủy đơn và gửi thông báo kèm lý do', async () => {
      repo.cancel.mockResolvedValue(makeOrder({ status: 'CANCELLED', salespersonId: userId }));
      const reason = 'Khách đổi ý';
      await service.cancel(tenantId, orderId, managerId, reason);

      expect(repo.cancel).toHaveBeenCalledWith(tenantId, orderId, managerId, reason);
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'order_cancelled',
          body: expect.stringContaining(reason),
        }),
      );
    });

    it('gửi thông báo không có lý do khi reason undefined', async () => {
      repo.cancel.mockResolvedValue(makeOrder({ status: 'CANCELLED', salespersonId: userId }));
      await service.cancel(tenantId, orderId, managerId);
      expect(notifications.send).toHaveBeenCalled();
    });
  });

  // ── addPayment ─────────────────────────────────────────────────────────────
  describe('addPayment()', () => {
    it('lưu thanh toán và thông báo cho salesperson', async () => {
      repo.findById.mockResolvedValue(makeOrder({ salespersonId: userId }));
      const dto = { amount: 200_000_000, method: 'BANK_TRANSFER' };
      const result = await service.addPayment(tenantId, orderId, userId, dto as any);

      expect(result.id).toBe('pay-1');
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'payment_received' }),
      );
    });

    it('thông báo chứa số tiền đã format', async () => {
      repo.findById.mockResolvedValue(makeOrder({ salespersonId: userId }));
      await service.addPayment(tenantId, orderId, userId, { amount: 100_000_000 } as any);
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('100.000.000') }),
      );
    });
  });

  // ── getSummary ─────────────────────────────────────────────────────────────
  describe('getSummary()', () => {
    it('trả về aggregated summary đúng cấu trúc', async () => {
      const result = await service.getSummary(tenantId);
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('totalRevenue');
    });
  });
});
