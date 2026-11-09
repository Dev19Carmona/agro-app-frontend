import type { IconName } from '../../../shared/ui/icon/icon.types';
import type { NotificationTemplate, NotificationTone } from '../models/notifications.types';

export interface NotificationPresentation {
  icon: IconName;
  tone: NotificationTone;
}

const PRESENTATION: Readonly<Record<NotificationTemplate, NotificationPresentation>> = {
  PAYMENT_APPROVED: { icon: 'credit-card', tone: 'brand' },
  PAYMENT_DECLINED: { icon: 'credit-card', tone: 'danger' },
  ORDER_CONFIRMED_BUYER: { icon: 'receipt', tone: 'brand' },
  ORDER_CONFIRMED_STORE: { icon: 'store', tone: 'brand' },
  ORDER_CANCELLED: { icon: 'receipt', tone: 'warning' },
  PROVIDER_APPROVED: { icon: 'check', tone: 'brand' },
  PROVIDER_REJECTED: { icon: 'alert', tone: 'danger' },
  USER_REGISTERED: { icon: 'user', tone: 'info' },
};

const FALLBACK: NotificationPresentation = { icon: 'bell', tone: 'info' };

/** Icono y tono de un aviso según su plantilla; una plantilla desconocida usa la campana. */
export function notificationPresentation(template: string): NotificationPresentation {
  return PRESENTATION[template as NotificationTemplate] ?? FALLBACK;
}

/** Clases de Tailwind (tokens del tema) del icono según el tono. */
export const NOTIFICATION_TONE_CLASSES: Readonly<Record<NotificationTone, string>> = {
  brand: 'text-brand-text',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

const MAX_BADGE = 99;

/** Texto de la insignia: el número hasta 99 y `99+` por encima. */
export function unreadBadgeText(count: number): string {
  return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Fecha y hora de un aviso en `es-CO`; un valor no válido devuelve cadena vacía. */
export function formatNotificationDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
}
