import { IsString, IsNumber, IsIn, IsOptional, IsMongoId } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  vendorId!: string;

  @IsString()
  items!: string;

  @IsNumber()
  totalAmount!: number;

  @IsString()
  expectedDate!: string;

  @IsOptional()
  @IsString()
  relatedProjectId?: string;
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
}
