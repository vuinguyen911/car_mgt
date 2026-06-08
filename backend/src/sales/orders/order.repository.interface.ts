import type { CreateOrderDto, AddPaymentDto, QueryOrderDto } from './dto/order.dto';

export interface IOrderRepository {
  findAll(tenantId: string, query: QueryOrderDto): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>;
  findById(tenantId: string, id: string): Promise<any | null>;
  create(tenantId: string, userId: string, dto: CreateOrderDto): Promise<any>;
  confirm(tenantId: string, id: string, userId: string): Promise<any>;
  approve(tenantId: string, id: string, userId: string): Promise<any>;
  deliver(tenantId: string, id: string, userId: string): Promise<any>;
  cancel(tenantId: string, id: string, userId: string, reason?: string): Promise<any>;
  addPayment(tenantId: string, orderId: string, userId: string, dto: AddPaymentDto): Promise<any>;
  getSummary(tenantId: string, branchId?: string): Promise<any>;
}
