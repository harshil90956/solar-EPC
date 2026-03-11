import { IsString, IsEmail, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  contact!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}
