import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsEnum(['individual', 'corporate'])
  @IsOptional()
  type?: string = 'individual';

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional() @IsString() idNumber?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsEnum(['male', 'female', 'other']) gender?: string;
}

export class QueryCustomerDto {
  @IsOptional() @IsString() search?: string;  // tên, phone, email
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() take?: number = 50;
}
