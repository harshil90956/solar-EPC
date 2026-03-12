import { IsEmail, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @IsNotEmpty()
  adminName!: string;

  @IsString()
  @IsNotEmpty()
  adminPassword!: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsObject()
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };

  @IsOptional()
  @IsObject()
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };

  @IsOptional()
  @IsObject()
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId?: string;
  };
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  adminName?: string;

  @IsOptional()
  @IsString()
  adminPassword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsObject()
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };

  @IsOptional()
  @IsObject()
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };

  @IsOptional()
  @IsObject()
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId?: string;
  };
}
