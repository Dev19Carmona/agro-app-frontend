import { HttpErrorResponse } from '@angular/common/http';
import { NETWORK_ERROR_MESSAGE, toApiError } from './to-api-error';

function httpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('toApiError', () => {
  it('lee code y message de un 409 con code', () => {
    const result = toApiError(
      httpError(409, { code: 'ORDER_NOT_PAYABLE', message: 'El pedido no admite pago' }),
    );
    expect(result).toEqual({
      status: 409,
      message: 'El pedido no admite pago',
      code: 'ORDER_NOT_PAYABLE',
    });
  });

  it('un 409 sin code no trae la propiedad code', () => {
    const result = toApiError(httpError(409, { message: 'Conflicto' }));
    expect(result).toEqual({ status: 409, message: 'Conflicto' });
    expect('code' in result).toBe(false);
  });

  it('un cuerpo HTML da el mensaje genérico y sin code', () => {
    const result = toApiError(httpError(500, '<html>boom</html>'));
    expect(result).toEqual({ status: 500, message: 'Ocurrió un error inesperado' });
  });

  it('ignora un code que no es texto', () => {
    expect(toApiError(httpError(400, { code: 7, message: 'x' }))).toEqual({
      status: 400,
      message: 'x',
    });
  });

  it('sin respuesta (status 0) es un error de conexión sin code', () => {
    expect(toApiError(httpError(0, null))).toEqual({
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});
