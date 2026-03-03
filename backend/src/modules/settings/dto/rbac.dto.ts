import { IsBoolean, IsObject, IsString } from 'class-validator';

export class UpdateRbacDto {
  @IsString()
  roleId!: string;

  @IsString()
  moduleId!: string;

  @IsObject()
  permissions!: Record<string, boolean>;
}

export class ToggleRbacPermissionDto {
  @IsString()
  actionId!: string;

  @IsBoolean()
  enabled!: boolean;
}
