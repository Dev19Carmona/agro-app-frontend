import { NETWORK_NOTE, toPaymentErrorAction } from './payment-error';

describe('toPaymentErrorAction', () => {
  it('409 ORDER_NOT_PAYABLE', () => {
    expect(toPaymentErrorAction({ status: 409, message: 'x', code: 'ORDER_NOT_PAYABLE' })).toEqual({
      kind: 'not-payable',
      message: 'El pedido ya no admite pago',
      reuseKey: false,
    });
  });

  it('409 PAYMENT_IN_PROGRESS', () => {
    const action = toPaymentErrorAction({ status: 409, message: 'x', code: 'PAYMENT_IN_PROGRESS' });
    expect(action.kind).toBe('in-progress');
    expect(action.message).toBe('Ya hay un pago en curso para este pedido');
    expect(action.reuseKey).toBe(false);
  });

  it('un 409 sin code conocido muestra el mensaje del backend', () => {
    expect(toPaymentErrorAction({ status: 409, message: 'Conflicto' })).toEqual({
      kind: 'other',
      message: 'Conflicto',
      reuseKey: false,
    });
  });

  it('422 pide una clave nueva', () => {
    const action = toPaymentErrorAction({ status: 422, message: 'La clave ya se usó' });
    expect(action.kind).toBe('key-reused');
    expect(action.reuseKey).toBe(false);
  });

  it('429 conserva la clave', () => {
    expect(toPaymentErrorAction({ status: 429, message: 'x' })).toEqual({
      kind: 'rate-limit',
      message: 'Demasiados intentos, espera un minuto',
      note: NETWORK_NOTE,
      reuseKey: true,
    });
  });

  it('sin conexión conserva la clave y aclara que no se cobra dos veces', () => {
    expect(
      toPaymentErrorAction({ status: 0, message: 'No se pudo conectar con el servidor' }),
    ).toEqual({
      kind: 'network',
      message: 'No se pudo conectar con el servidor',
      note: NETWORK_NOTE,
      reuseKey: true,
    });
  });

  it('404 es pedido no encontrado', () => {
    expect(toPaymentErrorAction({ status: 404, message: 'x' }).kind).toBe('not-found');
  });

  it('otro error muestra su mensaje', () => {
    expect(toPaymentErrorAction({ status: 500, message: 'Falló' })).toEqual({
      kind: 'other',
      message: 'Falló',
      reuseKey: false,
    });
  });
});
