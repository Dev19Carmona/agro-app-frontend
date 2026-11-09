const DATE = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha corta en español de Colombia (p. ej. «8 nov 2026»). Texto vacío si no es una fecha. */
export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? DATE.format(date) : '';
}

/** Fecha y hora en español de Colombia. Texto vacío si no es una fecha. */
export function formatDateTime(iso: string): string {
  const date = parse(iso);
  return date ? DATE_TIME.format(date) : '';
}
