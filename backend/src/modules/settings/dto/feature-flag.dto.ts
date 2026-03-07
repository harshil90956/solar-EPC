import { IsBoolean, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';

export class ToggleModuleDto {
  @IsBoolean()
  enabled!: boolean;
}

export class ToggleFeatureDto {
  @IsString()
  featureId!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class ToggleActionDto {
  @IsString()
  actionId!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  actions?: Record<string, boolean>;

  @IsOptional()
  @IsNumber()
  version?: number;
}
