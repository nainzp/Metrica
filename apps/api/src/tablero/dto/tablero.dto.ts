import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltrosTableroDto {
  @IsString()
  @IsOptional()
  areaId?: string;

  @IsString()
  @IsOptional()
  componenteId?: string;

  @Type(() => Number)
  @IsOptional()
  mes?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  trimestre?: number;

  @IsString()
  @IsOptional()
  ejecutor?: string;
}
