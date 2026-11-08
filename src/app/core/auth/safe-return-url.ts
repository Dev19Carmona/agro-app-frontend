import { Router } from '@angular/router';

/** Destino por defecto cuando no hay `returnUrl` o no es seguro. */
export const DEFAULT_RETURN_URL = '/catalogo';

/**
 * Devuelve `value` solo si es una ruta interna de la app; si no, `DEFAULT_RETURN_URL`.
 * Evita el open redirect: rechaza `//host`, `/\host` (el navegador lo trata como `//host`),
 * esquemas (`https:`, `javascript:`) y caracteres de control.
 */
export function safeReturnUrl(value: unknown, router: Router): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return DEFAULT_RETURN_URL;
  }
  if (value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) {
    return DEFAULT_RETURN_URL;
  }
  try {
    router.parseUrl(value);
  } catch {
    return DEFAULT_RETURN_URL;
  }
  return value;
}
