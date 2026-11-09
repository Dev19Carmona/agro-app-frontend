import type { ApiError } from '../../../core/http';

export type OrderStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export interface OrderSummary {
  id: string;
  total: number;
  moneda: 'COP';
  status: OrderStatus;
  /** ISO; solo desde `AWAITING_PAYMENT`. */
  expiresAt?: string;
  createdAt: string;
}

/** Ítem de un pedido tal como se compró (snapshot): un cambio posterior del catálogo no lo altera. */
export interface OrderItem {
  id: string;
  variantId: string;
  productId: string;
  nombreProducto: string;
  presentacion: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface SubOrder {
  id: string;
  storeId: string;
  subtotal: number;
  items: OrderItem[];
}

export interface Order extends OrderSummary {
  buyerId: string;
  subOrders: SubOrder[];
}

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
export const ORDER_PAYMENT_WINDOW_MS = 15 * 60 * 1000;
