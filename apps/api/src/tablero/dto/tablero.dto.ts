import { IsOptional, IsString } from 'class-validator';

export class FiltrosTableroDto {
  @IsString()
  @IsOptional()
  areaId?: string;

  @IsString()
  @IsOptional()
  componenteId?: string;
}
