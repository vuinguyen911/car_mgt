import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderPrismaRepository } from './order.prisma.repository';
import { ORDER_REPOSITORY } from '../../common/database/repository.tokens';

@Module({
  providers: [
    { provide: ORDER_REPOSITORY, useClass: OrderPrismaRepository },
    OrderPrismaRepository,
    OrdersService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
