import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}

  /** GET /search?q=toyota — global search xuyên vehicles, customers, orders */
  @Get()
  globalSearch(@CurrentUser() u: any, @Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.globalSearch(u.tenantId, q, limit ? parseInt(limit) : 5);
  }

  /** GET /search/vehicles — tìm kiếm xe nâng cao */
  @Get('vehicles')
  advancedSearch(
    @CurrentUser() u: any,
    @Query('q') q?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('yearFrom') yearFrom?: string,
    @Query('yearTo') yearTo?: string,
    @Query('priceFrom') priceFrom?: string,
    @Query('priceTo') priceTo?: string,
    @Query('condition') condition?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.advancedVehicleSearch(u.tenantId, {
      q, brandId, modelId,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      priceFrom: priceFrom ? parseFloat(priceFrom) : undefined,
      priceTo: priceTo ? parseFloat(priceTo) : undefined,
      condition, status, branchId, cursor,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
