import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { HttpExcepcionFiltro } from './comun/filtros/http-excepcion.filtro';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad con Helmet
  app.use(helmet());

  // Manejo de Cookies para Refresh Tokens
  app.use(cookieParser());

  // CORS restringido
  const urlPublica = process.env.URL_PUBLICA || 'http://localhost:5173';
  app.enableCors({
    origin: [urlPublica, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Prefijo global /api
  app.setGlobalPrefix('api');

  // Filtro global de excepciones normalizado
  app.useGlobalFilters(new HttpExcepcionFiltro());

  // Validación global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Documentación OpenAPI / Swagger (solo en entorno de PRUEBAS)
  const entorno = process.env.ENTORNO || 'PRUEBAS';
  if (entorno === 'PRUEBAS') {
    const config = new DocumentBuilder()
      .setTitle('MÉTRICA — API')
      .setDescription('API del Sistema de Seguimiento del Plan de Acción en Salud — Gobernación del Magdalena')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const puerto = process.env.PORT || 3000;
  await app.listen(puerto);
  console.log(`🚀 MÉTRICA API ejecutándose en http://localhost:${puerto}/api`);
  if (entorno === 'PRUEBAS') {
    console.log(`📖 Documentación Swagger disponible en http://localhost:${puerto}/api/docs`);
  }
}

bootstrap();
