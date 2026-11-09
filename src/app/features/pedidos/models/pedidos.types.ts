import type { ApiError } from '../../../core/http';
import type { OrderStatus } from '../../../core/orders';

export interface InvalidCheckoutLine {
  variantId: string;
  motivo: 'NOT_FOUND' | 'NOT_APTA';
}

/** Error de `POST /orders/checkout`; `lineas` solo viene con un `400` por líneas no compradas. */
export interface CheckoutApiError extends ApiError {
  lineas: InvalidCheckoutLine[];
}

/** Filtro de `/pedidos` (y de `GET /orders`). `status` ausente = todos. */
export interface OrdersFilter {
  page: number;
  status?: OrderStatus;
}

export const PEDIDOS_PAGE_SIZE = 10;
export const ORDER_POLL_INTERVAL_MS = 2000;
