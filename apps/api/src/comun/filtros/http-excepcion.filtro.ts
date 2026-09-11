import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExcepcionFiltro implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let codigo = 'ERROR_INTERNO';
    let mensaje = 'Ocurrió un error inesperado en el servidor.';
    let detalles: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resObj: any = exception.getResponse();

      if (typeof resObj === 'string') {
        mensaje = resObj;
      } else if (typeof resObj === 'object') {
        codigo = resObj.codigo || (status === 400 ? 'SOLICITUD_INVALIDA' : `ERROR_${status}`);
        mensaje = resObj.mensaje || resObj.message || mensaje;
        detalles = resObj.detalles || (Array.isArray(resObj.message) ? resObj.message : undefined);
      }
    } else if (exception instanceof Error) {
      mensaje = exception.message;
    }

    response.status(status).json({
      codigo,
      mensaje,
      detalles,
    });
  }
}
