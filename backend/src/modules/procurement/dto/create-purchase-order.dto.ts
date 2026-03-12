import { IsString, IsNumber, IsIn, IsOptional, IsMongoId, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  vendorId!: string;

  @IsOptional()
  @IsString()
  items?: string;

  @Type(() => Number)
  @IsNumber()
  totalAmount!: number;

  @IsString()
  expectedDate!: string;

  @IsOptional()
  @IsString()
  relatedProjectId?: string;

  // Inventory fields
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  requiredQuantity?: number;
}

export class UpdatePurchaseOrderStatusDto {
  @IsIn(['Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'])
  status!: string;

  @IsOptional()
  @IsString()
  deliveredDate?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  items?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsIn(['Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  deliveredDate?: string;

  @IsOptional()
  @IsString()
  relatedProjectId?: string;

  // Inventory fields
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  requiredQuantity?: number;
}
