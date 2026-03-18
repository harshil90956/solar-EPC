import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsDateString } from 'class-validator';
import { TaskStatus } from '../schemas/task.schema';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  assignedTo!: string;

  @IsEnum(['pending', 'in-progress', 'completed'])
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(['pending', 'in-progress', 'completed'])
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class QueryTaskDto {
  @IsEnum(['pending', 'in-progress', 'completed'])
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
