import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { UsuarioAutenticado } from '../decoradores/usuario-actual.decorador';

export interface AlcanceRecurso {
  areaId?: string | null;
  componenteId?: string | null;
  responsableId?: string | null;
}

/**
 * Función utilitaria para verificar si un usuario tiene alcance sobre un recurso dado
 */
export function validarAlcance(
  usuario: UsuarioAutenticado,
  recurso: AlcanceRecurso,
  esOperacionPropia = false,
): boolean {
  if (
    usuario.rol === RolUsuario.ADMINISTRADOR ||
    usuario.rol === RolUsuario.SECRETARIA ||
    usuario.rol === RolUsuario.ASISTENTE_DESPACHO
  ) {
    return true; // Alcance Global
  }

  if (esOperacionPropia && recurso.responsableId) {
    return recurso.responsableId === usuario.id;
  }

  if (usuario.rol === RolUsuario.LIDER_AREA) {
    // Su área y todos sus componentes
    return recurso.areaId === usuario.areaId;
  }

  if (usuario.rol === RolUsuario.LIDER_COMPONENTE) {
    // Solo su componente dentro de su área
    if (recurso.componenteId && usuario.componenteId) {
      return recurso.componenteId === usuario.componenteId;
    }
    return recurso.areaId === usuario.areaId;
  }

  if (usuario.rol === RolUsuario.FUNCIONARIO) {
    if (recurso.responsableId) {
      return recurso.responsableId === usuario.id;
    }
    return recurso.areaId === usuario.areaId;
  }

  return false;
}

/**
 * Genera el filtro Prisma where para restringir listas según el alcance del usuario
 */
export function generarFiltroAlcance(usuario: UsuarioAutenticado) {
  if (
    usuario.rol === RolUsuario.ADMINISTRADOR ||
    usuario.rol === RolUsuario.SECRETARIA ||
    usuario.rol === RolUsuario.ASISTENTE_DESPACHO
  ) {
    return {};
  }

  if (usuario.rol === RolUsuario.LIDER_AREA) {
    return { areaId: usuario.areaId };
  }

  if (usuario.rol === RolUsuario.LIDER_COMPONENTE) {
    if (usuario.componenteId) {
      return { areaId: usuario.areaId, componenteId: usuario.componenteId };
    }
    return { areaId: usuario.areaId };
  }

  // FUNCIONARIO
  return { areaId: usuario.areaId };
}
