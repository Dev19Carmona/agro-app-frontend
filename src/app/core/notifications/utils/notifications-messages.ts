import { NETWORK_ERROR_MESSAGE } from '../../http';
import type { ApiError } from '../../http';
import { NOTIFICATIONS_UNAVAILABLE_MESSAGE } from '../models/notifications.types';

export const NOTIFICATIONS_EMPTY_MESSAGE = 'No tienes notificaciones';
export const NOTIFICATIONS_RATE_LIMIT_MESSAGE = 'Demasiados intentos, espera un minuto';

/** Texto del error de una carga o acción de avisos, según el estado HTTP. */
export function notificationsErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 0:
      return NETWORK_ERROR_MESSAGE;
    case 429:
      return NOTIFICATIONS_RATE_LIMIT_MESSAGE;
    case 503:
      return NOTIFICATIONS_UNAVAILABLE_MESSAGE;
    default:
      return error.message;
  }
}
