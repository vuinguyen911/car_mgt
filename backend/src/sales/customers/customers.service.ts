import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CUSTOMER_REPOSITORY } from '../../common/database/repository.tokens';
import type { ICustomerRepository } from './customer.repository.interface';
import type { CreateCustomerDto, QueryCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly repo: ICustomerRepository) {}

  findAll(tenantId: string, query: QueryCustomerDto) { return this.repo.findAll(tenantId, query); }
  search(tenantId: string, q: string) { return this.repo.search(tenantId, q); }

  async findOne(tenantId: string, id: string) {
    const c = await this.repo.findById(tenantId, id);
    if (!c) throw new NotFoundException('Không tìm thấy khách hàng');
    return c;
  }

  create(tenantId: string, dto: CreateCustomerDto) { return this.repo.create(tenantId, dto); }
  update(tenantId: string, id: string, dto: Partial<CreateCustomerDto>) { return this.repo.update(tenantId, id, dto); }
  async remove(tenantId: string, id: string) { await this.repo.delete(tenantId, id); return { message: 'Đã xóa khách hàng' }; }
}
