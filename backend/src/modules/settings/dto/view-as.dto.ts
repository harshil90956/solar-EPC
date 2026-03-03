import { IsString } from 'class-validator';

export class StartViewAsDto {
  @IsString()
  targetUserId!: string;

  @IsString()
  targetRole!: string;
}

export class CheckPermissionDto {
  @IsString()
  moduleId!: string;

  @IsString()
  actionId!: string;
}
