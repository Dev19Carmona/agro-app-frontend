import {
  NOTIFICATIONS_POLL_INTERVAL_MS,
  NOTIFICATIONS_POLL_MAX_INTERVAL_MS,
} from '../models/notifications.types';

/** `429` (límite de peticiones) y `503` (servicio caído) piden espera creciente. */
export function shouldBackOff(status: number): boolean {
  return status === 429 || status === 503;
}

/**
 * Próxima espera del sondeo: tras un fallo que pide espera se duplica hasta
 * `NOTIFICATIONS_POLL_MAX_INTERVAL_MS`; tras un éxito vuelve al intervalo base.
 */
export function nextPollInterval(current: number, outcome: 'ok' | 'backoff'): number {
  if (outcome === 'ok') {
    return NOTIFICATIONS_POLL_INTERVAL_MS;
  }
  return Math.min(current * 2, NOTIFICATIONS_POLL_MAX_INTERVAL_MS);
}
