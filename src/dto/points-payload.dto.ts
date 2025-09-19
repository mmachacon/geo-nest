import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { PointDto } from './point.dto';

export class PointsPayloadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  @ArrayMinSize(1)
  points: PointDto[];
}
