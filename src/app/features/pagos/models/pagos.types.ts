export type PaymentMethod = 'CARD' | 'PSE' | 'NEQUI';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export interface Payment {
  id: string;
  orderId: string;
  /** Entero en COP. */
  monto: number;
  /** `'COP'`. */
  moneda: string;
  metodo: PaymentMethod;
  status: PaymentStatus;
  referencia?: string;
  /** Código técnico del backend (`INSUFFICIENT_FUNDS`, `GATEWAY_ERROR`, `INVALID_TOKEN`…). */
  motivoRechazo?: string;
  /** ISO. */
  createdAt: string;
}

export interface CreatePaymentRequest {
  orderId: string;
  metodo: PaymentMethod;
  token: string;
}

export interface PaymentsFilter {
  status?: PaymentStatus;
  orderId?: string;
  page: number;
}

export const PAGOS_PAGE_SIZE = 10;
/** El backend limita todo `/payments` a 10 peticiones por minuto. */
export const PAYMENT_POLL_INTERVAL_MS = 8000;
export const PAYMENT_POLL_MAX_INTERVAL_MS = 30 * 1000;
export const PAYMENT_POLL_MAX_MS = 2 * 60 * 1000;
export const ORDER_CONFIRM_POLL_INTERVAL_MS = 2000;
export const ORDER_CONFIRM_POLL_MAX_MS = 30 * 1000;
export const CUSTOM_TOKEN_MAX_LENGTH = 100;
