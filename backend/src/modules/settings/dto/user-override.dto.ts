import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class AssignCustomRoleDto {
  @IsString()
  customRoleId!: string | null;
}

export class SetPermissionOverrideDto {
  @IsString()
  moduleId!: string;

  @IsString()
  actionId!: string;

  @IsBoolean()
  value!: boolean | null;
}

export class ClearOverridesDto {
  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  actionId?: string;
}

export class BulkOverrideDto {
  @IsObject()
  overrides!: Record<string, Record<string, boolean | null>>;
}
