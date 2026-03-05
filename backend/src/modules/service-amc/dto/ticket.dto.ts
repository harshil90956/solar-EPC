import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsString()
  customerId!: string;

  @IsString()
  customerName!: string;

  @IsString()
  type!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['Open', 'Scheduled', 'In Progress', 'Resolved', 'Closed'])
  status?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  created?: string;

  @IsOptional()
  @IsDateString()
  resolved?: string | null;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['Open', 'Scheduled', 'In Progress', 'Resolved', 'Closed'])
  status?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  created?: string;

  @IsOptional()
  @IsDateString()
  resolved?: string | null;
}

export class QueryTicketDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 25)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class BulkActionDto {
  @IsString({ each: true })
  ids!: string[];
}
