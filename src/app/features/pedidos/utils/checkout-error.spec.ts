import { HttpErrorResponse } from '@angular/common/http';
import { invalidLinesFromBody, toCheckoutError } from './checkout-error';

function http(status: number, error: unknown) {
  return new HttpErrorResponse({ status, error });
}

describe('toCheckoutError', () => {
  it('un 400 con líneas devuelve el mensaje y las líneas', () => {
    const result = toCheckoutError(
      http(400, {
        message: 'El carrito tiene líneas que no se pueden comprar',
        lineas: [
          { variantId: 'v1', motivo: 'NOT_FOUND' },
          { variantId: 'v2', motivo: 'NOT_APTA' },
        ],
      }),
    );
    expect(result.status).toBe(400);
    expect(result.message).toBe('El carrito tiene líneas que no se pueden comprar');
    expect(result.lineas.map((l) => l.variantId)).toEqual(['v1', 'v2']);
  });

  it('un 400 sin líneas (carrito vacío) conserva el mensaje y no trae líneas', () => {
    const result = toCheckoutError(http(400, { message: 'El carrito está vacío' }));
    expect(result).toEqual({ status: 400, message: 'El carrito está vacío', lineas: [] });
  });

  it('sin respuesta (status 0) es un error de conexión sin líneas', () => {
    const result = toCheckoutError(http(0, new ProgressEvent('error')));
    expect(result.status).toBe(0);
    expect(result.lineas).toEqual([]);
  });

  it('un 502 del proxy se trata como sin conexión', () => {
    expect(toCheckoutError(http(502, '<html>Bad Gateway</html>')).status).toBe(0);
  });

  it('un error que no es de HTTP también sale como error de conexión', () => {
    expect(toCheckoutError(new Error('x'))).toEqual({
      status: 0,
      message: 'No se pudo conectar con el servidor',
      lineas: [],
    });
  });

  it('un 500 no lee líneas aunque el cuerpo las traiga', () => {
    const result = toCheckoutError(
      http(500, { message: 'Error', lineas: [{ variantId: 'v1', motivo: 'NOT_APTA' }] }),
    );
    expect(result.lineas).toEqual([]);
  });
});

describe('invalidLinesFromBody', () => {
  it('descarta las líneas con forma o motivo inválidos', () => {
    expect(
      invalidLinesFromBody({
        lineas: [{ variantId: 'v1', motivo: 'OTRO' }, { motivo: 'NOT_APTA' }, null, 'x'],
      }),
    ).toEqual([]);
  });

  it('un cuerpo sin lineas o que no es objeto da una lista vacía', () => {
    expect(invalidLinesFromBody(null)).toEqual([]);
    expect(invalidLinesFromBody('texto')).toEqual([]);
    expect(invalidLinesFromBody({ lineas: 'no' })).toEqual([]);
  });
});
