export interface IBrandRepository {
  findAll(tenantId: string): Promise<any[]>;
  findById(tenantId: string, id: string): Promise<any | null>;
  create(tenantId: string, data: { name: string; country?: string; logoUrl?: string }): Promise<any>;
  update(tenantId: string, id: string, data: { name?: string; country?: string; logoUrl?: string; isActive?: boolean }): Promise<any>;
  softDelete(tenantId: string, id: string): Promise<any>;
}
