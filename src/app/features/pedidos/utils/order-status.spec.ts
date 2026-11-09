import {
  ORDER_STATUSES,
  cancellationMessage,
  isOrderStatus,
  orderStatusLabel,
  orderStatusTone,
} from './order-status';

describe('order-status', () => {
  it('cada estado tiene etiqueta y variante de badge', () => {
    expect(ORDER_STATUSES.map(orderStatusLabel)).toEqual([
      'Pendiente',
      'Esperando pago',
      'Confirmado',
      'Cancelado',
    ]);
    expect(ORDER_STATUSES.map(orderStatusTone)).toEqual([
      'neutral',
      'warning',
      'success',
      'danger',
    ]);
  });

  it('isOrderStatus solo acepta los cuatro valores', () => {
    expect(isOrderStatus('CONFIRMED')).toBe(true);
    expect(isOrderStatus('confirmed')).toBe(false);
    expect(isOrderStatus('')).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
  });

  describe('cancellationMessage', () => {
    it('cancelado con expiresAt: venció sin pago', () => {
      expect(
        cancellationMessage({ status: 'CANCELLED', expiresAt: '2026-11-09T10:15:00.000Z' }),
      ).toBe('El pedido venció sin pago');
    });

    it('cancelado sin expiresAt: no se pudo reservar el stock', () => {
      expect(cancellationMessage({ status: 'CANCELLED' })).toBe('No se pudo reservar el stock');
    });

    it('otros estados no tienen mensaje', () => {
      expect(cancellationMessage({ status: 'CONFIRMED', expiresAt: 'x' })).toBeNull();
      expect(cancellationMessage({ status: 'PENDING' })).toBeNull();
    });
  });
});
