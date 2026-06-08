import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerPrismaRepository } from './customer.prisma.repository';
import { CUSTOMER_REPOSITORY } from '../../common/database/repository.tokens';

@Module({
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerPrismaRepository },
    CustomerPrismaRepository,
    CustomersService,
  ],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
