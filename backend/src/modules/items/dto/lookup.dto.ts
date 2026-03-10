import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manager?: string;
}

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manager?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCategoryDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateUnitDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
