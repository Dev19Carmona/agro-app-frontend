import { AdminUser } from '../models/admin.types';

/** Qué acciones se ofrecen sobre un usuario. */
export interface UserActions {
  approve: boolean;
  reject: boolean;
  disable: boolean;
  enable: boolean;
  changeRole: boolean;
  /**
   * `true` si el usuario es el administrador actual y por eso se le ocultan acciones que sí
   * aplicarían a otra cuenta (deshabilitar, cambiar rol): se sustituyen por una nota.
   */
  selfNote: boolean;
}

/**
 * Reglas de acción de la SPEC 09. Es ayuda de UX: el backend sigue siendo la autoridad.
 *
 * - Aprobar y rechazar: `PROVEEDOR` en `PENDING_APPROVAL`.
 * - Deshabilitar: `ACTIVE` y no es el administrador actual.
 * - Habilitar: `DISABLED`.
 * - Cambiar rol: `ACTIVE` o `DISABLED` y no es el administrador actual.
 */
export function userActions(user: AdminUser, currentUserId: string | null): UserActions {
  const isSelf = currentUserId !== null && user.id === currentUserId;
  const settled = user.status === 'ACTIVE' || user.status === 'DISABLED';
  const pendingProvider = user.rol === 'PROVEEDOR' && user.status === 'PENDING_APPROVAL';
  return {
    approve: pendingProvider,
    reject: pendingProvider,
    disable: user.status === 'ACTIVE' && !isSelf,
    enable: user.status === 'DISABLED',
    changeRole: settled && !isSelf,
    selfNote: isSelf && settled,
  };
}
