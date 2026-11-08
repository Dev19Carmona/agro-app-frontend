import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../http/api-config';
import { SessionService } from './session';
import { SessionRefresher, isInvalidRefresh } from './session-refresher';

/** Endpoints de `/auth` que no llevan `Authorization` ni se reintentan ante `401`. */
const PUBLIC_AUTH_PATHS: readonly string[] = ['/auth/login', '/auth/register', '/auth/refresh'];

function withBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Añade `Authorization: Bearer` solo a peticiones hacia `API_BASE_URL`. Ante `401` renueva la
 * sesión una sola vez (compartido entre peticiones simultáneas) y reintenta la petición una vez;
 * si el refresh falla porque el token ya no sirve, borra la sesión y manda a login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  const isApiUrl = req.url === base || req.url.startsWith(`${base}/`);
  if (!isApiUrl || PUBLIC_AUTH_PATHS.includes(req.url.slice(base.length))) {
    return next(req);
  }

  const session = inject(SessionService);
  const refresher = inject(SessionRefresher);
  const router = inject(Router);
  const token = session.getAccessToken();

  return next(withBearer(req, token)).pipe(
    catchError((error: unknown) => {
      // Sin access token no hay sesión que renovar: el `401` es de la petición, no de la sesión.
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
        return throwError(() => error);
      }
      // Otra petición ya renovó el token mientras esta volaba: basta reintentar con el nuevo.
      const current = session.getAccessToken();
      if (current && current !== token) {
        return next(withBearer(req, current));
      }
      return retryAfterRefresh(req, next, error, session, refresher, router);
    }),
  );
};

function retryAfterRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  original: HttpErrorResponse,
  session: SessionService,
  refresher: SessionRefresher,
  router: Router,
) {
  return from(refresher.refresh()).pipe(
    catchError((refreshError: unknown) => {
      if (isInvalidRefresh(refreshError)) {
        endSession(session, router);
      }
      return throwError(() => original);
    }),
    // El reintento queda fuera del `catchError` anterior: solo se reintenta una vez.
    switchMap(() => next(withBearer(req, session.getAccessToken()))),
  );
}

function endSession(session: SessionService, router: Router): void {
  // Varias peticiones fallan a la vez: solo la primera encuentra la sesión abierta.
  if (!session.isAuthenticated()) {
    return;
  }
  const returnUrl = router.url;
  session.clear();
  void router.navigate(['/auth/login'], {
    queryParams: {
      ...(returnUrl.startsWith('/auth/') || returnUrl === '/' ? {} : { returnUrl }),
      aviso: 'sesion',
    },
  });
}
