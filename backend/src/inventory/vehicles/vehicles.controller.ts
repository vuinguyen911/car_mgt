import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(user.tenantId, query);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any, @Query('branchId') branchId?: string) {
    return this.vehiclesService.getStats(user.tenantId, branchId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vehiclesService.findOne(user.tenantId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.SALES_STAFF)
  create(@CurrentUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.tenantId, user.id, dto);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.SALES_STAFF)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>) {
    return this.vehiclesService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vehiclesService.remove(user.tenantId, id);
  }
}
