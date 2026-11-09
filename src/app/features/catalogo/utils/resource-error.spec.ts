import { resourceApiError } from './resource-error';

describe('resourceApiError', () => {
  it('sin error devuelve null', () => {
    expect(resourceApiError(undefined)).toBeNull();
  });

  it('recupera el ApiError que viene en cause', () => {
    const api = { status: 404, message: 'Producto no encontrado' };
    expect(resourceApiError(new Error('envuelto', { cause: api }))).toEqual(api);
  });

  it('sin un ApiError en cause da un error genérico', () => {
    expect(resourceApiError(new Error('x'))).toEqual({
      status: 500,
      message: 'Ocurrió un error inesperado',
    });
  });
});
