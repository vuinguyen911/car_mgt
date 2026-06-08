import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';

export interface VehicleItem {
  id: string;
  vin: string;
  plateNumber: string | null;
  condition: string;
  status: string;
  odometerKm: number;
  sellingPrice: unknown;
  lotLocation: string | null;
  createdAt: Date;
  variant: {
    year: number;
    trimLevel: string | null;
    engineType: string | null;
    transmission: string | null;
    model: { name: string; segment: string | null; brand: { name: string } };
  };
  exteriorColor: { name: string; hexCode: string | null } | null;
  branch: { id: string; name: string; city: string | null } | null;
  images: { url: string }[];
}

export interface VehicleDetail extends VehicleItem {
  engineNumber: string | null;
  chassisNumber: string | null;
  interiorColor: string | null;
  costPrice: unknown;
  minPrice: unknown;
  manufactureDate: Date | null;
  importDate: Date | null;
  registeredDate: Date | null;
  notes: string | null;
  statusLogs: { id: string; fromStatus: string | null; toStatus: string; changedBy: string | null; note: string | null; createdAt: Date }[];
}

export interface VehicleStats {
  total: number;
  byStatus: Record<string, number>;
  byCondition: Record<string, number>;
}

export interface IVehicleRepository {
  findAll(tenantId: string, query: QueryVehicleDto): Promise<{ items: VehicleItem[]; nextCursor: string | null; hasMore: boolean }>;
  findById(tenantId: string, id: string): Promise<VehicleDetail | null>;
  create(tenantId: string, userId: string, dto: CreateVehicleDto): Promise<VehicleDetail>;
  update(tenantId: string, id: string, userId: string, dto: Partial<CreateVehicleDto>): Promise<VehicleDetail>;
  delete(tenantId: string, id: string): Promise<void>;
  getStats(tenantId: string, branchId?: string): Promise<VehicleStats>;
}
