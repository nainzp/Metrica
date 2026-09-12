import { IsOptional, IsString } from 'class-validator';
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
}
