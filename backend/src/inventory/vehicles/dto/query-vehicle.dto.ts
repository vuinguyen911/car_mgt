import { IsOptional, IsString, IsInt, Min, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleCondition, VehicleStatus } from '@prisma/client';

export class QueryVehicleDto {
  @IsOptional()
  @IsString()
  search?: string; // VIN, plate, brand, model

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsEnum(VehicleCondition)
  condition?: VehicleCondition;

  @IsOptional()
  @IsString()
  cursor?: string; // UUID of last item (cursor-based pagination)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc' = 'desc';
}
