import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateCustomRoleDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseRole?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  bg?: string;
}

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseRole?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  bg?: string;
}

export class UpdateCustomRolePermissionsDto {
  @IsString()
  moduleId!: string;

  @IsObject()
  permissions!: Record<string, boolean>;
}

export class CloneRoleDto {
  @IsString()
  label!: string;
}
