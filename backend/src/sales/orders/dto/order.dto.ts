import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsUUID() vehicleId: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() branchId?: string;

  @IsNumber() @Min(0) listPrice: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number = 0;
  @IsNumber() @Min(0) finalPrice: number;

  @IsOptional() @IsEnum(['cash', 'installment', 'bank_transfer']) paymentMethod?: string;
  @IsOptional() @IsNumber() @Min(0) depositAmount?: number = 0;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AddPaymentDto {
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsEnum(['cash', 'transfer', 'card']) method?: string;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() note?: string;
}

export class QueryOrderDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() salespersonId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) take?: number = 50;
}
