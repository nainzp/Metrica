import { IsString, IsNotEmpty } from 'class-validator';

export class PurgarDatosPruebaDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe ingresar la palabra de confirmación.' })
  palabraConfirmacion: string;

  @IsString()
  @IsNotEmpty({ message: 'Debe ingresar su contraseña de administrador.' })
  contrasena: string;
}
