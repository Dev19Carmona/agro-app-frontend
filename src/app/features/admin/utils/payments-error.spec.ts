import { RATE_LIMIT_MESSAGE, paymentsError } from './payments-error';

describe('paymentsError', () => {
  it('un 429 muestra el mensaje de espera', () => {
    expect(
      paymentsError({ status: 429, message: 'ThrottlerException: Too Many Requests' }),
    ).toEqual({ status: 429, message: 'Demasiados intentos, espera un minuto' });
    expect(RATE_LIMIT_MESSAGE).toBe('Demasiados intentos, espera un minuto');
  });

  it('otros errores y null se dejan igual', () => {
    const error = { status: 500, message: 'Fallo' };
    expect(paymentsError(error)).toBe(error);
    expect(paymentsError(null)).toBeNull();
  });
});
