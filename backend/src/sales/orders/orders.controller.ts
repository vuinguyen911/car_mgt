import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddPaymentDto, QueryOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query() query: QueryOrderDto) {
    return this.svc.findAll(u.tenantId, query);
  }

  @Get('summary')
  summary(@CurrentUser() u: any, @Query('branchId') branchId?: string) {
    return this.svc.getSummary(u.tenantId, branchId);
  }

  @Get(':id')
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.findOne(u.tenantId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_STAFF)
  create(@CurrentUser() u: any, @Body() dto: CreateOrderDto) {
    return this.svc.create(u.tenantId, u.id, dto);
  }

  @Put(':id/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_STAFF)
  confirm(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.confirm(u.tenantId, id, u.id);
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER)
  approve(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.approve(u.tenantId, id, u.id);
  }

  @Put(':id/deliver')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER)
  deliver(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deliver(u.tenantId, id, u.id);
  }

  @Put(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER)
  cancel(@CurrentUser() u: any, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.svc.cancel(u.tenantId, id, u.id, reason);
  }

  @Post(':id/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_STAFF)
  addPayment(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.svc.addPayment(u.tenantId, id, u.id, dto);
  }
}
