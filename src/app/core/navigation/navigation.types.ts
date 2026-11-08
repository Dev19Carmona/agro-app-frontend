import type { IconName } from '../../shared/ui/icon/icon.types';
import type { SessionRole } from '../auth/auth.types';

export type NavGroupName = 'Explorar' | 'Compras' | 'Mi tienda' | 'Administración' | 'Cuenta';

export interface NavItem {
  label: string;
  /** Ruta absoluta, p. ej. `/admin/usuarios`. */
  path: string;
  /** Nombre de icono de `app-icon`. */
  icon: IconName;
  /** Roles que ven el ítem en el panel. */
  roles: SessionRole[];
  group: NavGroupName;
  /** Marca el ítem activo solo con coincidencia exacta (p. ej. `/catalogo` y no `/catalogo/ofertas`). */
  exact?: boolean;
}

/** Ítems visibles de un grupo, listos para pintar. */
export interface NavGroup {
  name: NavGroupName;
  items: NavItem[];
}

/** Datos que lleva cada ruta en `Route.data`; los leen el placeholder y la navegación. */
export interface RouteInfo {
  roles: SessionRole[];
  description: string;
  /** Endpoints del backend que consumirá la pantalla, p. ej. `['GET /orders', 'GET /orders/:id']`. */
  endpoints: string[];
}
