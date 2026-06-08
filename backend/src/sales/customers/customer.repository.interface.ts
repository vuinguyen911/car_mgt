import type { CreateCustomerDto, QueryCustomerDto } from './dto/customer.dto';

export interface ICustomerRepository {
  findAll(tenantId: string, query: QueryCustomerDto): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>;
  findById(tenantId: string, id: string): Promise<any | null>;
  create(tenantId: string, dto: CreateCustomerDto): Promise<any>;
  update(tenantId: string, id: string, dto: Partial<CreateCustomerDto>): Promise<any>;
  delete(tenantId: string, id: string): Promise<void>;
  search(tenantId: string, q: string): Promise<any[]>; // quick search cho dropdown
}
