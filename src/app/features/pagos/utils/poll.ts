import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_MAX_INTERVAL_MS } from '../models/pagos.types';

/**
 * Intervalo del siguiente sondeo de un pago: ante un `429` se duplica hasta el máximo; en
 * cualquier otro caso vuelve al intervalo base.
 */
export function nextPollInterval(current: number, rateLimited: boolean): number {
  return rateLimited
    ? Math.min(current * 2, PAYMENT_POLL_MAX_INTERVAL_MS)
    : PAYMENT_POLL_INTERVAL_MS;
}

/** `true` mientras no se haya agotado el tiempo máximo de sondeo (`elapsed` y `max` en ms). */
export function withinPollWindow(elapsed: number, max: number): boolean {
  return elapsed < max;
}
