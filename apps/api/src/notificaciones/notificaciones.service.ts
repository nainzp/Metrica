import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene o inicializa el transportador de correo si está configurado
   */
  private async obtenerTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    const [host, puerto, usuario, clave, seguro] = await Promise.all([
      this.prisma.parametro.findUnique({ where: { clave: 'smtp_host' } }),
      this.prisma.parametro.findUnique({ where: { clave: 'smtp_puerto' } }),
      this.prisma.parametro.findUnique({ where: { clave: 'smtp_usuario' } }),
      this.prisma.parametro.findUnique({ where: { clave: 'smtp_clave' } }),
      this.prisma.parametro.findUnique({ where: { clave: 'smtp_seguro' } }),
    ]);

    if (!host?.valor || !usuario?.valor) {
      return null;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: host.valor,
        port: puerto?.valor ? Number(puerto.valor) : 587,
        secure: seguro?.valor === 'true',
        auth: {
          user: usuario.valor,
          pass: clave?.valor || '',
        },
      });
      return this.transporter;
    } catch (err) {
      this.logger.error('Error configurando transporter de correo:', err);
      return null;
    }
  }

  /**
   * Crea una notificación en la aplicación y envía correo asíncrono si está habilitado (RN-32 y RN-33)
   */
  async crear(datos: {
    usuarioId: string;
    tipoCodigo: string;
    titulo: string;
    mensaje: string;
    enlace?: string;
  }) {
    const notificacion = await this.prisma.notificacion.create({
      data: {
        usuarioId: datos.usuarioId,
        tipoCodigo: datos.tipoCodigo,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        enlace: datos.enlace,
      },
      include: {
        usuario: true,
        tipo: true,
      },
    });

    // Enviar correo de forma asíncrona sin bloquear la transacción principal (RN-33)
    this.procesarEnvioCorreo(notificacion).catch((err) => {
      this.logger.warn(`No se pudo enviar correo para notificación ${notificacion.id}: ${err.message}`);
    });

    return notificacion;
  }

  /**
   * Envío en segundo plano de correo electrónico según parámetros y preferencias
   */
  private async procesarEnvioCorreo(notificacion: any) {
    const parametroActivo = await this.prisma.parametro.findUnique({
      where: { clave: 'correo_activo' },
    });

    if (parametroActivo?.valor !== 'true') {
      return; // Correo desactivado globalmente
    }

    const { usuario, tipo } = notificacion;
    if (!usuario || !tipo) return;

    // Regla RN-32: debe tener enviaCorreo = true en el tipo, y el usuario recibeCorreo (salvo si esAlerta = true)
    if (!tipo.enviaCorreo) return;
    if (!tipo.esAlerta && !usuario.recibeCorreo) return;

    const transporter = await this.obtenerTransporter();
    if (!transporter) {
      await this.prisma.notificacion.update({
        where: { id: notificacion.id },
        data: { correoError: 'Servidor SMTP no configurado en parámetros.' },
      });
      return;
    }

    const remitenteParam = await this.prisma.parametro.findUnique({
      where: { clave: 'correo_remitente' },
    });
    const remitente = remitenteParam?.valor || 'metrica@magdalena.gov.co';

    const urlBaseParam = await this.prisma.parametro.findUnique({
      where: { clave: 'url_base' },
    });
    const urlBase = urlBaseParam?.valor || 'http://localhost:5173';
    const enlaceCompleto = notificacion.enlace ? `${urlBase}${notificacion.enlace}` : urlBase;

    try {
      await transporter.sendMail({
        from: `"MÉTRICA — Secretaría de Salud del Magdalena" <${remitente}>`,
        to: usuario.correo,
        subject: `[MÉTRICA] ${notificacion.titulo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0B2A5B; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">MÉTRICA</h2>
              <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Gobernación del Magdalena · Secretaría de Salud</p>
            </div>
            <div style="padding: 24px; color: #1e293b;">
              <h3 style="margin-top: 0; color: #0B2A5B;">${notificacion.titulo}</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">${notificacion.mensaje}</p>
              ${
                notificacion.enlace
                  ? `<div style="margin: 24px 0; text-align: center;">
                      <a href="${enlaceCompleto}" style="background-color: #1E5FD9; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Abrir en MÉTRICA</a>
                    </div>`
                  : ''
              }
            </div>
            <div style="background-color: #f8fafc; padding: 12px 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
              Este correo se envía porque el sistema MÉTRICA generó un aviso automático. Puede gestionar sus preferencias en su perfil institucional.
            </div>
          </div>
        `,
      });

      await this.prisma.notificacion.update({
        where: { id: notificacion.id },
        data: { correoEnviado: true, correoError: null },
      });
    } catch (err: any) {
      await this.prisma.notificacion.update({
        where: { id: notificacion.id },
        data: { correoEnviado: false, correoError: err.message },
      });
    }
  }

  /**
   * Crea múltiples notificaciones en lote
   */
  async crearMultiples(
    notificaciones: Array<{
      usuarioId: string;
      tipoCodigo: string;
      titulo: string;
      mensaje: string;
      enlace?: string;
    }>,
  ) {
    const resultados = [];
    for (const n of notificaciones) {
      const res = await this.crear(n);
      resultados.push(res);
    }
    return resultados;
  }

  /**
   * Lista notificaciones del usuario
   */
  async listar(
    usuarioId: string,
    filtros: { soloNoLeidas?: boolean; pagina?: number; tamano?: number } = {},
  ) {
    const pagina = Number(filtros.pagina) || 1;
    const tamano = Number(filtros.tamano) || 20;
    const skip = (pagina - 1) * tamano;

    const where: any = { usuarioId };
    if (filtros.soloNoLeidas) {
      where.leida = false;
    }

    const [total, noLeidas, datos] = await Promise.all([
      this.prisma.notificacion.count({ where }),
      this.prisma.notificacion.count({ where: { usuarioId, leida: false } }),
      this.prisma.notificacion.findMany({
        where,
        include: { tipo: true },
        orderBy: { creadaEn: 'desc' },
        skip,
        take: tamano,
      }),
    ]);

    return {
      datos,
      total,
      noLeidas,
      pagina,
      tamano,
    };
  }

  /**
   * Cuenta notificaciones no leídas de un usuario
   */
  async contarNoLeidas(usuarioId: string) {
    const total = await this.prisma.notificacion.count({
      where: { usuarioId, leida: false },
    });
    return { noLeidas: total };
  }

  /**
   * Marca una notificación como leída
   */
  async marcarLeida(id: string, usuarioId: string) {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: { id, usuarioId },
    });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');

    return this.prisma.notificacion.update({
      where: { id },
      data: { leida: true, leidaEn: new Date() },
    });
  }

  /**
   * Marca todas las notificaciones del usuario como leídas
   */
  async marcarTodasLeidas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true, leidaEn: new Date() },
    });
    return { ok: true };
  }
}
