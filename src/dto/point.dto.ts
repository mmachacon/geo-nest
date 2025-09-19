import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class PointDto {
  @IsNumber()
  @IsLatitude()
  lat: number;

  @IsNumber()
  @IsLongitude()
  lng: number;
}
