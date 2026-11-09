import type { ApiError } from '../../../core/http';

export type PaymentErrorKind =
  'not-payable' | 'in-progress' | 'key-reused' | 'rate-limit' | 'network' | 'not-found' | 'other';

/** Qué hacer con el error de un `POST /payments`. */
export interface PaymentErrorAction {
  kind: PaymentErrorKind;
  message: string;
  /** Aclaración adicional que va debajo del mensaje. */
  note?: string;
  /** `true` si el reintento debe usar la misma `Idempotency-Key` (no hubo respuesta del cobro). */
  reuseKey: boolean;
}

export const NETWORK_NOTE = 'Si el cobro llegó a procesarse, no se repetirá al reintentar.';

export function toPaymentErrorAction(error: ApiError): PaymentErrorAction {
  if (error.status === 0) {
    return { kind: 'network', message: error.message, note: NETWORK_NOTE, reuseKey: true };
  }
  if (error.status === 429) {
    return {
      kind: 'rate-limit',
      message: 'Demasiados intentos, espera un minuto',
      note: NETWORK_NOTE,
      reuseKey: true,
    };
  }
  if (error.status === 409 && error.code === 'ORDER_NOT_PAYABLE') {
    return { kind: 'not-payable', message: 'El pedido ya no admite pago', reuseKey: false };
  }
  if (error.status === 409 && error.code === 'PAYMENT_IN_PROGRESS') {
    return {
      kind: 'in-progress',
      message: 'Ya hay un pago en curso para este pedido',
      reuseKey: false,
    };
  }
  if (error.status === 422) {
    return {
      kind: 'key-reused',
      message: 'No se pudo procesar el intento. Vuelve a intentarlo.',
      reuseKey: false,
    };
  }
  if (error.status === 404) {
    return { kind: 'not-found', message: 'Pedido no encontrado', reuseKey: false };
  }
  return { kind: 'other', message: error.message, reuseKey: false };
}
