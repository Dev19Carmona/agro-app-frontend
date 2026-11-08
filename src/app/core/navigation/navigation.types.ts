import type { IconName } from '../../shared/ui/icon/icon.types';

/**
 * Rol simulado del header. No hay sesión ni permisos reales: solo decide qué ítems ve el panel.
 * `VISITANTE` es quien no ha iniciado sesión.
 */
export type DemoRole = 'VISITANTE' | 'PRODUCTOR' | 'PROVEEDOR' | 'ADMIN';

/** Roles de negocio del backend (todos menos el visitante). */
export type AppRole = Exclude<DemoRole, 'VISITANTE'>;

/** Clave de `localStorage` donde se guarda el rol de demo. */
export const DEMO_ROLE_STORAGE_KEY = 'agro:demo-role';

export type NavGroupName = 'Explorar' | 'Compras' | 'Mi tienda' | 'Administración' | 'Cuenta';

export interface NavItem {
  label: string;
  /** Ruta absoluta, p. ej. `/admin/usuarios`. */
  path: string;
  /** Nombre de icono de `app-icon`. */
  icon: IconName;
  /** Roles que ven el ítem en el panel. */
  roles: DemoRole[];
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
  roles: DemoRole[];
  description: string;
  /** Endpoints del backend que consumirá la pantalla, p. ej. `['GET /orders', 'GET /orders/:id']`. */
  endpoints: string[];
}
