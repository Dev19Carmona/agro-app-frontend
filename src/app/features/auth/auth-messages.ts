import { ApiError } from '../../core/http/api-error';
import { AlertVariant } from '../../shared/ui/alert/alert.types';

export const NETWORK_MESSAGE = 'No se pudo conectar con el servidor';
export const TOO_MANY_MESSAGE = 'Demasiados intentos, espera un minuto';

/** Mensaje de un error de `POST /auth/login`. */
export function loginErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 0:
      return NETWORK_MESSAGE;
    case 401:
      return 'Credenciales inválidas';
    case 429:
      return TOO_MANY_MESSAGE;
    default:
      // 403 (cuenta pendiente, rechazada o deshabilitada): el backend explica el motivo.
      return error.message;
  }
}

/** Mensaje de un error de `POST /auth/register`. */
export function registerErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 0:
      return NETWORK_MESSAGE;
    case 409:
      return 'Ese email ya está registrado';
    case 429:
      return TOO_MANY_MESSAGE;
    default:
      return error.message;
  }
}

/** Mensaje de un error de `POST /auth/change-password`. */
export function changePasswordErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 0:
      return NETWORK_MESSAGE;
    case 429:
      return TOO_MANY_MESSAGE;
    default:
      // 401 (contraseña actual incorrecta) y 400 (política): el backend explica el motivo.
      return error.message;
  }
}

/** Aviso que puede mostrar el login según `?aviso=`. Cualquier otro valor se ignora. */
export interface LoginNotice {
  variant: AlertVariant;
  message: string;
}

const NOTICES = new Map<string, LoginNotice>([
  ['registro', { variant: 'success', message: 'Cuenta creada. Inicia sesión para continuar.' }],
  ['clave', { variant: 'success', message: 'Tu contraseña cambió. Inicia sesión con la nueva.' }],
  ['sesion', { variant: 'info', message: 'Tu sesión expiró. Inicia sesión de nuevo.' }],
]);

export function loginNotice(value: string | null): LoginNotice | null {
  return (value !== null && NOTICES.get(value)) || null;
}
