import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsEnum,
  MinLength,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecursoTareaItemDto {
  @IsString()
  @IsNotEmpty()
  recursoId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsOptional()
  nota?: string;
}

export class CrearTareaDto {
  @IsString()
  @IsNotEmpty()
  metaId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  fase?: string;

  @IsString()
  @IsOptional()
  categoriaId?: string;

  @IsString()
  @IsNotEmpty()
  responsableId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @IsString()
  @IsOptional()
  horaInicio?: string;

  @IsString()
  @IsOptional()
  horaFin?: string;

  @IsString()
  @IsOptional()
  lugar?: string;

  @IsBoolean()
  @IsOptional()
  requiereSecretaria?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RecursoTareaItemDto)
  recursos?: RecursoTareaItemDto[];
}

export class ActualizarTareaDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  fase?: string;

  @IsString()
  @IsOptional()
  categoriaId?: string;

  @IsString()
  @IsOptional()
  responsableId?: string;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @IsString()
  @IsOptional()
  horaInicio?: string;

  @IsString()
  @IsOptional()
  horaFin?: string;

  @IsString()
  @IsOptional()
  lugar?: string;

  @IsBoolean()
  @IsOptional()
  requiereSecretaria?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RecursoTareaItemDto)
  recursos?: RecursoTareaItemDto[];
}

export class FinalizarTareaDto {
  @IsString()
  @IsNotEmpty({ message: 'La observación de cierre es obligatoria.' })
  @MinLength(5, { message: 'La observación de cierre debe tener al menos 5 caracteres.' })
  observacionCierre: string;

  @IsArray()
  @IsOptional()
  soportesIds?: string[];
}

export class ReabrirTareaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de reapertura es obligatorio.' })
  @MinLength(5, { message: 'El motivo de reapertura debe tener al menos 5 caracteres.' })
  motivo: string;
}

export class CancelarTareaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio.' })
  @MinLength(5, { message: 'El motivo de cancelación debe tener al menos 5 caracteres.' })
  motivo: string;
}

export class PresenciaTareaDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['CONFIRMAR', 'DECLINAR'])
  accion: 'CONFIRMAR' | 'DECLINAR';

  @IsString()
  @IsOptional()
  motivo?: string;
}

export class VerificarCrucesDto {
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  horaInicio: string;

  @IsString()
  @IsNotEmpty()
  horaFin: string;

  @IsString()
  @IsNotEmpty()
  responsableId: string;

  @IsBoolean()
  @IsOptional()
  requiereSecretaria?: boolean;

  @IsString()
  @IsOptional()
  excluirId?: string;
}
