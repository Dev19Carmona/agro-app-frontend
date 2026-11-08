import { Route } from '@angular/router';
import { SessionRole } from '../../auth';
import { RouteInfo } from '../../navigation';

/** Todos los roles de la sesión: la ruta es pública o la ve cualquiera. */
export const ALL_ROLES: SessionRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

/**
 * Ruta lazy que muestra el placeholder. SPEC 03 cambia el `loadComponent` de cada una por su
 * pantalla real; `title` y `data` (`RouteInfo`) se conservan.
 */
export function placeholderRoute(path: string, title: string, info: RouteInfo): Route {
  return {
    path,
    title,
    data: info,
    loadComponent: () => import('../components/route-placeholder/route-placeholder').then((m) => m.RoutePlaceholder),
  };
}
