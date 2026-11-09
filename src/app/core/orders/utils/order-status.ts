import type { BadgeTone } from '../../../shared/ui/badge/badge.types';
import { OrderStatus, OrderSummary } from '../models/orders.types';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
];

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  AWAITING_PAYMENT: 'Esperando pago',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
};

const TONES: Record<OrderStatus, BadgeTone> = {
  PENDING: 'neutral',
  AWAITING_PAYMENT: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status];
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  return TONES[status];
}

export function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Motivo de una cancelación, inferido porque el backend no devuelve `cancelReason`: con `expiresAt`
 * el pedido llegó a esperar el pago y venció; sin él, no se pudo reservar el stock. `null` si el
 * pedido no está cancelado.
 */
export function cancellationMessage(
  order: Pick<OrderSummary, 'status' | 'expiresAt'>,
): string | null {
  if (order.status !== 'CANCELLED') {
    return null;
  }
  return order.expiresAt ? 'El pedido venció sin pago' : 'No se pudo reservar el stock';
}
