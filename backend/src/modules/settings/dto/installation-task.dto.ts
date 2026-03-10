import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskDefinitionDto {
  @IsString()
  name!: string;

  @IsBoolean()
  photoRequired!: boolean;
}

export class UpdateInstallationTasksConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDefinitionDto)
  tasks!: TaskDefinitionDto[];
}
