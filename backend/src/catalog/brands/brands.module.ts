import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { BrandPrismaRepository } from './brand.prisma.repository';
import { BRAND_REPOSITORY } from '../../common/database/repository.tokens';

@Module({
  providers: [
    { provide: BRAND_REPOSITORY, useClass: BrandPrismaRepository },
    BrandPrismaRepository,
    BrandsService,
  ],
  controllers: [BrandsController],
})
export class BrandsModule {}
