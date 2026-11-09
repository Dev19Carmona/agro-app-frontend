import type { NotificationsFilter } from '../../../core/notifications';

interface ParamReader {
  get(name: string): string | null;
}

/** `?filtro=`: solo acepta `no-leidas`; cualquier otro valor (o ninguno) es `todas`. */
export function parseNotificationsFilter(params: ParamReader): NotificationsFilter {
  return params.get('filtro') === 'no-leidas' ? 'no-leidas' : 'todas';
}

/** Query params de la URL para un filtro; `todas` (el valor por defecto) no se escribe. */
export function notificationsFilterQuery(filter: NotificationsFilter): Record<string, string> {
  return filter === 'no-leidas' ? { filtro: 'no-leidas' } : {};
}
