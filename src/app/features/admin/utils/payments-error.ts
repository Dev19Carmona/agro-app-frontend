import type { ApiError } from '../../../core/http';

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos, espera un minuto';

/**
 * El backend limita `payments/admin` a 10 peticiones por minuto: ante un `429` se muestra un
 * mensaje claro en vez del texto técnico. Cualquier otro error se deja igual.
 */
export function paymentsError(error: ApiError | null): ApiError | null {
  return error?.status === 429 ? { ...error, message: RATE_LIMIT_MESSAGE } : error;
}
