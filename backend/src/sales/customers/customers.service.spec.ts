import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CUSTOMER_REPOSITORY } from '../../common/database/repository.tokens';
import type { ICustomerRepository } from './customer.repository.interface';

const tenantId    = 'tenant-1';
const customerId  = 'cust-uuid-1';

const mockCustomer = {
  id: customerId,
  tenantId,
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  email: 'nva@example.com',
  type: 'INDIVIDUAL',
  idNumber: '012345678910',
  taxCode: null,
  address: 'Hà Nội',
  createdAt: new Date(),
};

function makeRepo(): jest.Mocked<ICustomerRepository> {
  return {
    findAll:  jest.fn().mockResolvedValue({ items: [mockCustomer], nextCursor: null, hasMore: false }),
    findById: jest.fn().mockResolvedValue(mockCustomer),
    search:   jest.fn().mockResolvedValue([mockCustomer]),
    create:   jest.fn().mockResolvedValue(mockCustomer),
    update:   jest.fn().mockResolvedValue(mockCustomer),
    delete:   jest.fn().mockResolvedValue(undefined),
  };
}

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<ICustomerRepository>;

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CUSTOMER_REPOSITORY, useValue: repo },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  describe('findOne()', () => {
    it('trả về customer khi tìm thấy', async () => {
      const result = await service.findOne(tenantId, customerId);
      expect(result.fullName).toBe('Nguyễn Văn A');
    });

    it('ném NotFoundException khi không tìm thấy', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('tìm kiếm đúng theo tenantId — không rò rỉ dữ liệu tenant khác', async () => {
      await service.findOne(tenantId, customerId);
      expect(repo.findById).toHaveBeenCalledWith(tenantId, customerId);
    });
  });

  describe('create()', () => {
    it('tạo khách hàng mới và trả về record', async () => {
      const dto = { fullName: 'Trần Thị B', phone: '0912345678', type: 'INDIVIDUAL' };
      const result = await service.create(tenantId, dto as any);
      expect(result.id).toBe(customerId);
      expect(repo.create).toHaveBeenCalledWith(tenantId, dto);
    });
  });

  describe('remove()', () => {
    it('xóa khách hàng và trả về message', async () => {
      const result = await service.remove(tenantId, customerId);
      expect(result.message).toContain('xóa');
      expect(repo.delete).toHaveBeenCalledWith(tenantId, customerId);
    });
  });

  describe('search()', () => {
    it('tìm kiếm theo chuỗi và trả về danh sách', async () => {
      const result = await service.search(tenantId, 'Nguyễn');
      expect(result).toHaveLength(1);
      expect(repo.search).toHaveBeenCalledWith(tenantId, 'Nguyễn');
    });
  });
});
