import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController, PerfilController } from './autenticacion.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRETO || 'metrica_jwt_secret_magdalena_salud_2026_super_seguro_min_32_bytes',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AutenticacionController, PerfilController],
  providers: [AutenticacionService, JwtStrategy, PrismaService],
  exports: [AutenticacionService, JwtModule],
})
export class AutenticacionModule {}
