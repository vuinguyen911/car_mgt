import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, QueryCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query() query: QueryCustomerDto) {
    return this.svc.findAll(u.tenantId, query);
  }

  @Get('search')
  search(@CurrentUser() u: any, @Query('q') q: string) {
    return this.svc.search(u.tenantId, q ?? '');
  }

  @Get(':id')
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.findOne(u.tenantId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_STAFF)
  create(@CurrentUser() u: any, @Body() dto: CreateCustomerDto) {
    return this.svc.create(u.tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_STAFF)
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) {
    return this.svc.update(u.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.remove(u.tenantId, id);
  }
}
