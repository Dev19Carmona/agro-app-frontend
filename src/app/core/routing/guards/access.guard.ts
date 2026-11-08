import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { RouteInfo } from '../../navigation';
import { SessionRole } from '../../auth';
import { DEFAULT_RETURN_URL } from '../../auth';
import { SessionService } from '../../auth';

const ALL_ROLES: readonly SessionRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

/**
 * Único guard de acceso. Lee `RouteInfo.roles` de cada ruta:
 * - sin `data.roles` (404, demos, niveles intermedios): no se comprueba;
 * - los cuatro roles: ruta pública;
 * - solo `['VISITANTE']`: ruta de invitado (login, registro); con sesión redirige al catálogo;
 * - sin `VISITANTE`: ruta privada; sin sesión va a login con `returnUrl`, y con un rol no
 *   incluido, a `/acceso-denegado`.
 */
export const accessGuard: CanActivateChildFn = (childRoute, state) => {
  const roles = (childRoute.data as Partial<RouteInfo> | undefined)?.roles;
  if (!roles) {
    return true;
  }
  if (ALL_ROLES.every((role) => roles.includes(role))) {
    return true;
  }

  const router = inject(Router);
  const role = inject(SessionService).role();

  if (roles.length === 1 && roles[0] === 'VISITANTE') {
    return role === 'VISITANTE' ? true : router.parseUrl(DEFAULT_RETURN_URL);
  }
  if (roles.includes(role)) {
    return true;
  }
  if (role === 'VISITANTE') {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return router.parseUrl('/acceso-denegado');
};
