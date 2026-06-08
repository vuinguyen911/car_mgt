import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.brandsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.brandsService.findOne(user.tenantId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  create(@CurrentUser() user: any, @Body() body: { name: string; country?: string; logoUrl?: string }) {
    return this.brandsService.create(user.tenantId, body);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.brandsService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.brandsService.remove(user.tenantId, id);
  }
}
