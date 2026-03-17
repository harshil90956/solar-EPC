import { IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  leadId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class QueryCustomersDto {
  @IsOptional()
  @IsString()
  search?: string;
}
