import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  itemId!: string;

  @IsString()
  name!: string;

  @IsEnum(['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'])
  category!: string;

  @IsEnum(['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'])
  unit!: string;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsNumber()
  @Min(0)
  reserved!: number;

  @IsNumber()
  @Min(0)
  available!: number;

  @IsNumber()
  @Min(0)
  minStock!: number;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsString()
  warehouse!: string;
}

export class UpdateInventoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  available?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class StockInDto {
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class StockOutDto {
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  issuedDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateReservationDto {
  @IsString()
  itemId!: string;

  @IsString()
  projectId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(['active', 'fulfilled', 'cancelled', 'expired'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
