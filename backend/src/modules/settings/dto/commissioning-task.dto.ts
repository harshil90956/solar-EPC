import { IsArray, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class CommissioningTaskDto {
  @IsString()
  name!: string;

  @IsBoolean()
  photoRequired!: boolean;
}

export class UpdateCommissioningTasksConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissioningTaskDto)
  tasks!: CommissioningTaskDto[];
}
