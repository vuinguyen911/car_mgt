import { Injectable, Inject } from '@nestjs/common';
import { BRAND_REPOSITORY } from '../../common/database/repository.tokens';
import type { IBrandRepository } from './brand.repository.interface';

@Injectable()
export class BrandsService {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepo: IBrandRepository,
  ) {}

  findAll(tenantId: string) { return this.brandRepo.findAll(tenantId); }
  findOne(tenantId: string, id: string) { return this.brandRepo.findById(tenantId, id); }
  create(tenantId: string, data: { name: string; country?: string; logoUrl?: string }) { return this.brandRepo.create(tenantId, data); }
  update(tenantId: string, id: string, data: any) { return this.brandRepo.update(tenantId, id, data); }
  remove(tenantId: string, id: string) { return this.brandRepo.softDelete(tenantId, id); }
}
