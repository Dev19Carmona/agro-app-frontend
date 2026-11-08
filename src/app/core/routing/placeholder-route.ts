import { Route } from '@angular/router';
import { DemoRole, RouteInfo } from '../navigation/navigation.types';

/** Todos los roles de demo: la ruta es pública o la ve cualquiera. */
export const ALL_ROLES: DemoRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

/**
 * Ruta lazy que muestra el placeholder. SPEC 03 cambia el `loadComponent` de cada una por su
 * pantalla real; `title` y `data` (`RouteInfo`) se conservan.
 */
export function placeholderRoute(path: string, title: string, info: RouteInfo): Route {
  return {
    path,
    title,
    data: info,
    loadComponent: () => import('./route-placeholder').then((m) => m.RoutePlaceholder),
  };
}
