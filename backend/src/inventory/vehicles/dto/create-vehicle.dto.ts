import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString, MinLength, MaxLength } from 'class-validator';
import { VehicleCondition, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsUUID()
  variantId: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  exteriorColorId?: string;

  @IsString()
  @MinLength(17)
  @MaxLength(17)
  vin: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  engineNumber?: string;

  @IsOptional()
  @IsString()
  chassisNumber?: string;

  @IsOptional()
  @IsString()
  interiorColor?: string;

  @IsOptional()
  @IsEnum(VehicleCondition)
  condition?: VehicleCondition = VehicleCondition.NEW;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus = VehicleStatus.AVAILABLE;

  @IsOptional()
  @IsNumber()
  odometerKm?: number = 0;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsString()
  lotLocation?: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsDateString()
  importDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
