/**
 * Milisegundos que faltan hasta `expiresAt` (ISO) desde `now` (ms). Nunca es negativo; una fecha
 * inválida cuenta como ya vencida (0).
 */
export function remainingMs(expiresAt: string, now: number): number {
  const end = Date.parse(expiresAt);
  return Number.isNaN(end) ? 0 : Math.max(0, end - now);
}

/** `mm:ss`; los milisegundos se redondean hacia arriba, así `00:00` solo aparece al vencer. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
