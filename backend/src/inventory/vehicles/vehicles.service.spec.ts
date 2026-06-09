import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VEHICLE_REPOSITORY } from '../../common/database/repository.tokens';
import type { IVehicleRepository, VehicleDetail, VehicleStats } from './vehicle.repository.interface';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const tenantId = 'tenant-1';
const userId   = 'user-1';
const vehicleId = 'vehicle-uuid-1';

const mockVehicleDetail: VehicleDetail = {
  id: vehicleId,
  vin: 'VIN001ABC',
  plateNumber: '51A-123.45',
  condition: 'NEW',
  status: 'AVAILABLE',
  odometerKm: 0,
  sellingPrice: 800_000_000,
  lotLocation: 'A-01',
  engineNumber: 'ENG001',
  chassisNumber: 'CHS001',
  interiorColor: 'Đen',
  costPrice: 700_000_000,
  minPrice: 750_000_000,
  manufactureDate: null,
  importDate: new Date('2024-01-10'),
  registeredDate: null,
  notes: null,
  createdAt: new Date('2024-01-10'),
  variant: {
    year: 2024,
    trimLevel: 'Premium',
    engineType: '2.0T',
    transmission: 'AT',
    model: { name: 'Tucson', segment: 'SUV', brand: { name: 'Hyundai' } },
  },
  exteriorColor: { name: 'Trắng', hexCode: '#FFFFFF' },
  branch: { id: 'branch-1', name: 'HCM', city: 'Hồ Chí Minh' },
  images: [],
  statusLogs: [],
};

const mockStats: VehicleStats = {
  total: 100,
  byStatus: { AVAILABLE: 60, RESERVED: 20, SOLD: 15, SERVICE: 5 },
  byCondition: { NEW: 70, USED: 30 },
};

function makeRepo(): jest.Mocked<IVehicleRepository> {
  return {
    findAll:  jest.fn().mockResolvedValue({ items: [mockVehicleDetail], nextCursor: null, hasMore: false }),
    findById: jest.fn().mockResolvedValue(mockVehicleDetail),
    create:   jest.fn().mockResolvedValue(mockVehicleDetail),
    update:   jest.fn().mockResolvedValue(mockVehicleDetail),
    delete:   jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockResolvedValue(mockStats),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: jest.Mocked<IVehicleRepository>;

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VEHICLE_REPOSITORY, useValue: repo },
      ],
    }).compile();
    service = module.get<VehiclesService>(VehiclesService);
  });

  // ── findAll ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('delegate xuống repository với đúng tham số', async () => {
      const query = { status: 'AVAILABLE', limit: 20 };
      await service.findAll(tenantId, query as any);
      expect(repo.findAll).toHaveBeenCalledWith(tenantId, query);
    });

    it('trả về danh sách xe kèm pagination', async () => {
      const result = await service.findAll(tenantId, {} as any);
      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('trả về chi tiết xe khi tìm thấy', async () => {
      const result = await service.findOne(tenantId, vehicleId);
      expect(result.vin).toBe('VIN001ABC');
      expect(result.status).toBe('AVAILABLE');
    });

    it('ném NotFoundException khi không tìm thấy xe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('tìm kiếm theo đúng tenantId để tránh data leak', async () => {
      await service.findOne(tenantId, vehicleId);
      expect(repo.findById).toHaveBeenCalledWith(tenantId, vehicleId);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('tạo xe và trả về VehicleDetail', async () => {
      const dto = { vin: 'VIN002', variantId: 'v-1', condition: 'NEW' };
      const result = await service.create(tenantId, userId, dto as any);
      expect(result.vin).toBe('VIN001ABC');
      expect(repo.create).toHaveBeenCalledWith(tenantId, userId, dto);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('gọi repo.update với đúng tham số', async () => {
      const dto = { sellingPrice: 820_000_000 };
      await service.update(tenantId, vehicleId, userId, dto as any);
      expect(repo.update).toHaveBeenCalledWith(tenantId, vehicleId, userId, dto);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('xóa xe và trả về message xác nhận', async () => {
      const result = await service.remove(tenantId, vehicleId);
      expect(result.message).toContain('xóa');
      expect(repo.delete).toHaveBeenCalledWith(tenantId, vehicleId);
    });
  });

  // ── getStats ───────────────────────────────────────────────────────────────
  describe('getStats()', () => {
    it('trả về thống kê tổng hợp đúng cấu trúc', async () => {
      const result = await service.getStats(tenantId);
      expect(result.total).toBe(100);
      expect(result.byStatus).toHaveProperty('AVAILABLE');
      expect(result.byCondition).toHaveProperty('NEW');
    });

    it('truyền branchId xuống repo khi có filter', async () => {
      await service.getStats(tenantId, 'branch-1');
      expect(repo.getStats).toHaveBeenCalledWith(tenantId, 'branch-1');
    });
  });
});
