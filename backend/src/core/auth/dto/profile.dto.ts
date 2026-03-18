import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class ProfileResponseDto {
  id!: string;
  email!: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImage?: string;
  phone?: string;
  role!: string;
  tenantId?: string;
  isSuperAdmin!: boolean;
}
