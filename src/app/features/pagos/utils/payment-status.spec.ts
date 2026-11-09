import {
  PAYMENT_STATUSES,
  blocksNewPayment,
  isPaymentSettled,
  isPaymentStatus,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  rejectionMessage,
} from './payment-status';

describe('payment-status', () => {
  it('cada estado tiene etiqueta y variante de badge', () => {
    expect(PAYMENT_STATUSES.map(paymentStatusLabel)).toEqual([
      'Pendiente',
      'En proceso',
      'Aprobado',
      'Rechazado',
      'Con error',
    ]);
    expect(PAYMENT_STATUSES.map(paymentStatusTone)).toEqual([
      'neutral',
      'info',
      'success',
      'danger',
      'warning',
    ]);
  });

  it('etiqueta cada método', () => {
    expect(paymentMethodLabel('CARD')).toBe('Tarjeta');
    expect(paymentMethodLabel('PSE')).toBe('PSE');
    expect(paymentMethodLabel('NEQUI')).toBe('Nequi');
  });

  it('isPaymentStatus solo acepta los cinco valores', () => {
    expect(PAYMENT_STATUSES.every((s) => isPaymentStatus(s))).toBe(true);
    expect(isPaymentStatus('approved')).toBe(false);
    expect(isPaymentStatus('')).toBe(false);
    expect(isPaymentStatus(null)).toBe(false);
  });

  it('APPROVED, DECLINED y ERROR son terminales; PENDING y PROCESSING no', () => {
    expect(PAYMENT_STATUSES.filter(isPaymentSettled)).toEqual(['APPROVED', 'DECLINED', 'ERROR']);
  });

  it('PENDING, PROCESSING y APPROVED bloquean un pago nuevo', () => {
    expect(PAYMENT_STATUSES.filter(blocksNewPayment)).toEqual([
      'PENDING',
      'PROCESSING',
      'APPROVED',
    ]);
  });

  it('traduce los motivos conocidos y deja los desconocidos tal cual', () => {
    expect(rejectionMessage('INSUFFICIENT_FUNDS')).toBe('Fondos insuficientes');
    expect(rejectionMessage('GATEWAY_ERROR')).toBe('Falla de la pasarela, intenta de nuevo');
    expect(rejectionMessage('INVALID_TOKEN')).toBe('El token de pago no es válido');
    expect(rejectionMessage('ALGO_NUEVO')).toBe('ALGO_NUEVO');
    expect(rejectionMessage(undefined)).toBeNull();
    expect(rejectionMessage('')).toBeNull();
  });
});
