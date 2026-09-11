import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CrearObservacionDto {
  @IsString()
  @IsOptional()
  metaId?: string;

  @IsString()
  @IsOptional()
  tareaId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El texto de la observación es obligatorio.' })
  @MinLength(5, { message: 'La observación debe tener al menos 5 caracteres.' })
  texto: string;
}

export class AtenderObservacionDto {
  @IsString()
  @IsNotEmpty({ message: 'La respuesta o plan de acción es obligatorio.' })
  @MinLength(5, { message: 'La respuesta debe tener al menos 5 caracteres.' })
  respuesta: string;
}
