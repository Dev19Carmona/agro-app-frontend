import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';

export const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor';
/** Estados con los que un proxy indica que el backend no está disponible. */
const GATEWAY_STATUSES: readonly number[] = [502, 503, 504];
const FALLBACK_MESSAGE = 'Ocurrió un error inesperado';

/** `message` del cuerpo de error de Nest: `string` o `string[]` (validación). */
function extractMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    const text = body.trim();
    // Una página HTML (404 de Express, error de un proxy…) no es un mensaje para el usuario.
    return text && !text.startsWith('<') ? text : null;
  }
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return null;
  }
  const { message } = body;
  if (typeof message === 'string') {
    return message.trim() || null;
  }
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === 'string');
    return parts.length ? parts.join('. ') : null;
  }
  return null;
}

/** Convierte cualquier error de `HttpClient` en un `ApiError`. `status` 0 = sin respuesta. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    // 502/503/504 los responde un proxy (p. ej. el de `ng serve`) cuando el backend no contesta.
    if (error.status === 0 || GATEWAY_STATUSES.includes(error.status)) {
      return { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    return { status: error.status, message: extractMessage(error.error) ?? FALLBACK_MESSAGE };
  }
  return { status: 0, message: NETWORK_ERROR_MESSAGE };
}
