/** Tono del aviso: marca (éxito), informativo, advertencia o peligro. */
export type ToastTone = 'brand' | 'info' | 'warning' | 'danger';

/** Enlace opcional del toast; `url` es una ruta interna de la app. */
export interface ToastLink {
  label: string;
  url: string;
}

export interface ToastOptions {
  title: string;
  message?: string;
  /** Por defecto `'info'`. `danger` se anuncia con `role="alert"`. */
  tone?: ToastTone;
  link?: ToastLink;
  /** Milisegundos hasta que se cierra solo. Por defecto `TOAST_DURATION_MS` (6000). */
  durationMs?: number;
}

export interface ToastItem {
  id: number;
  title: string;
  message: string | null;
  tone: ToastTone;
  link: ToastLink | null;
}

export const TOAST_DURATION_MS = 6_000;
/** Toasts simultáneos; al superarlo se descartan los más antiguos. */
export const TOAST_MAX_VISIBLE = 4;
