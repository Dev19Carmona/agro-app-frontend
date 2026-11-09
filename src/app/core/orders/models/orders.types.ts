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

/** Tiempo que tiene el productor para pagar un pedido desde que queda en `AWAITING_PAYMENT`. */
export const ORDER_PAYMENT_WINDOW_MS = 15 * 60 * 1000;
