import { ApiError } from '../../../core/http';

const UNEXPECTED: ApiError = { status: 500, message: 'Ocurrió un error inesperado' };

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).message === 'string'
  );
}

/**
 * `rxResource` envuelve en un `Error` lo que no es un `Error` (nuestros `ApiError` son objetos
 * planos) y deja el original en `cause`. Esto lo recupera para mostrarlo en pantalla.
 */
export function resourceApiError(error: Error | undefined): ApiError | null {
  if (!error) {
    return null;
  }
  return isApiError(error.cause) ? error.cause : UNEXPECTED;
}
