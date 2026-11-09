import type { BadgeTone } from '../../../shared/ui/badge/badge.types';
import { PaymentMethod, PaymentStatus } from '../models/payments.types';

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
  'APPROVED',
  'DECLINED',
  'ERROR',
];

const LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  APPROVED: 'Aprobado',
  DECLINED: 'Rechazado',
  ERROR: 'Con error',
};

const TONES: Record<PaymentStatus, BadgeTone> = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  APPROVED: 'success',
  DECLINED: 'danger',
  ERROR: 'warning',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Tarjeta',
  PSE: 'PSE',
  NEQUI: 'Nequi',
};

/** Motivos técnicos que conoce el simulador, en español. Uno desconocido se muestra tal cual. */
const REASONS: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Fondos insuficientes',
  GATEWAY_ERROR: 'Falla de la pasarela, intenta de nuevo',
  INVALID_TOKEN: 'El token de pago no es válido',
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return LABELS[status];
}

export function paymentStatusTone(status: PaymentStatus): BadgeTone {
  return TONES[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return METHOD_LABELS[method];
}

export function isPaymentStatus(value: string | null): value is PaymentStatus {
  return value !== null && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/** `PENDING` y `PROCESSING` aún pueden cambiar: se sondean. El resto es terminal. */
export function isPaymentSettled(status: PaymentStatus): boolean {
  return status === 'APPROVED' || status === 'DECLINED' || status === 'ERROR';
}

/** Un pago en este estado impide crear otro (el backend respondería `PAYMENT_IN_PROGRESS`). */
export function blocksNewPayment(status: PaymentStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING' || status === 'APPROVED';
}

/** Texto del motivo de rechazo; `null` si el pago no trae motivo. */
export function rejectionMessage(reason: string | undefined): string | null {
  if (!reason) {
    return null;
  }
  return REASONS[reason] ?? reason;
}
