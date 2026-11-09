import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from '../../../core/http';
import { CheckoutApiError, InvalidCheckoutLine } from '../models/pedidos.types';

const MOTIVOS: readonly string[] = ['NOT_FOUND', 'NOT_APTA'];

function isInvalidLine(value: unknown): value is InvalidCheckoutLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { variantId, motivo } = value as Record<string, unknown>;
  return typeof variantId === 'string' && typeof motivo === 'string' && MOTIVOS.includes(motivo);
}

/** Líneas inválidas del cuerpo de un `400` (`lineas`); vacío si no vienen o tienen otra forma. */
export function invalidLinesFromBody(body: unknown): InvalidCheckoutLine[] {
  if (typeof body !== 'object' || body === null || !('lineas' in body)) {
    return [];
  }
  const { lineas } = body;
  return Array.isArray(lineas) ? lineas.filter(isInvalidLine) : [];
}

/**
 * Convierte el error de `HttpClient` del checkout en un `CheckoutApiError`: el `ApiError` normal
 * más las líneas que el backend rechazó (solo con `400`). Sin respuesta (`status 0`) no hay líneas.
 */
export function toCheckoutError(error: unknown): CheckoutApiError {
  const apiError = toApiError(error);
  const lineas =
    error instanceof HttpErrorResponse && apiError.status === 400
      ? invalidLinesFromBody(error.error)
      : [];
  return { ...apiError, lineas };
}
