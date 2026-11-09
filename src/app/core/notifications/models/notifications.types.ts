/** Plantillas de aviso del backend (campo `plantilla`). */
export type NotificationTemplate =
  | 'USER_REGISTERED'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_DECLINED'
  | 'ORDER_CONFIRMED_BUYER'
  | 'ORDER_CONFIRMED_STORE'
  | 'ORDER_CANCELLED';

/** Espejo de `NotificationView` del backend. `titulo` y `mensaje` ya vienen en español. */
export interface AppNotification {
  id: string;
  plantilla: NotificationTemplate;
  destinatarioTipo: 'USER' | 'STORE';
  titulo: string;
  mensaje: string;
  /** Solo en avisos de pago y pedido. */
  orderId: string | null;
  /** ISO. */
  sentAt: string;
  /** ISO; `null` = sin leer. */
  readAt: string | null;
}

export interface NotificationsPage {
  data: AppNotification[];
  /** `null` en la última página. */
  nextCursor: string | null;
}

/** Parámetros de `GET /notifications`: solo se envían los que tienen valor. */
export interface NotificationsQuery {
  limit?: number;
  cursor?: string | null;
}

/** Lo mínimo de un sub-pedido del proveedor para enlazarlo desde un aviso. */
export interface ProviderSubOrderRef {
  id: string;
  orderId: string;
}

export interface ProviderSubOrderRefsPage {
  data: ProviderSubOrderRef[];
  page: number;
  totalPages: number;
}

/** Páginas (de `PROVIDER_SUB_ORDERS_PAGE_SIZE`) que se revisan al buscar el sub-pedido de un aviso. */
export const PROVIDER_SUB_ORDERS_MAX_PAGES = 4;
export const PROVIDER_SUB_ORDERS_PAGE_SIZE = 50;

/** `?filtro=no-leidas` en la URL de `/notificaciones`. */
export type NotificationsFilter = 'todas' | 'no-leidas';

/** Tono visual de un aviso; el icono lo acompaña para que el color no sea la única señal. */
export type NotificationTone = 'brand' | 'danger' | 'warning' | 'info';

/** Mensaje del `503`: el servicio `notifications` está caído o lento y el resto de la API sigue. */
export const NOTIFICATIONS_UNAVAILABLE_MESSAGE = 'El servicio de notificaciones no está disponible';

export const NOTIFICATIONS_POLL_INTERVAL_MS = 45_000;
/** Tope de la espera creciente ante `429` o `503`. */
export const NOTIFICATIONS_POLL_MAX_INTERVAL_MS = 300_000;
/** Avisos en el panel de la campana. */
export const NOTIFICATIONS_PANEL_SIZE = 10;
/** Avisos por página en `/notificaciones`. */
export const NOTIFICATIONS_PAGE_SIZE = 20;
/** Toasts de avisos simultáneos (más un resumen «y N avisos más»). */
export const NOTIFICATIONS_TOAST_MAX = 3;
export const NOTIFICATIONS_TOAST_DURATION_MS = 6_000;
/** Avisos que se piden para detectar los nuevos al subir el contador. */
export const NOTIFICATIONS_TOAST_FETCH_SIZE = 5;
