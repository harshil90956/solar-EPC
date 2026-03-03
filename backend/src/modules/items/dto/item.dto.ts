import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNumber, IsOptional, Min, IsMongoId } from 'class-validator';

export class CreateItemDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax2?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  itemGroupId?: string;

  @IsOptional()
  @IsString()
  itemGroupName?: string;
}

export class UpdateItemDto extends PartialType(CreateItemDto) {}
