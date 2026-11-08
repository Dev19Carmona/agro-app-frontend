import type { IconName } from '../../shared/ui/icon/icon.types';
import type { DemoRole, NavGroupName, NavItem } from './navigation.types';

/** Opciones del selector de rol de demo del header. */
export const DEMO_ROLE_OPTIONS: readonly { id: DemoRole; label: string }[] = [
  { id: 'VISITANTE', label: 'Visitante' },
  { id: 'PRODUCTOR', label: 'Productor' },
  { id: 'PROVEEDOR', label: 'Proveedor' },
  { id: 'ADMIN', label: 'Administrador' },
];

/** Orden en que se muestran los grupos en el panel. */
export const NAV_GROUP_ORDER: readonly NavGroupName[] = [
  'Explorar',
  'Compras',
  'Mi tienda',
  'Administración',
  'Cuenta',
];

const ALL: DemoRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];
const LOGGED: DemoRole[] = ['PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

function item(
  group: NavGroupName,
  label: string,
  path: string,
  icon: IconName,
  roles: DemoRole[],
  exact = false,
): NavItem {
  return { group, label, path, icon, roles, ...(exact ? { exact } : {}) };
}

/**
 * Todos los ítems del panel. Cada `path` debe existir en el árbol de rutas
 * (`src/app/app.routes.ts` y los `features/*`); un test lo comprueba.
 *
 * Los nombres de los ítems de un mismo rol son únicos, para que un lector de pantalla no
 * encuentre dos enlaces iguales hacia destinos distintos.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  // Explorar: público
  item('Explorar', 'Catálogo', '/catalogo', 'grid', ALL, true),
  item('Explorar', 'Ofertas', '/catalogo/ofertas', 'tag', ALL),
  item('Explorar', 'Tiendas', '/catalogo/tiendas', 'store', ALL),

  // Compras: PRODUCTOR
  item('Compras', 'Carrito', '/carrito', 'cart', ['PRODUCTOR']),
  item('Compras', 'Pedidos', '/pedidos', 'receipt', ['PRODUCTOR']),
  item('Compras', 'Pagos', '/pagos', 'credit-card', ['PRODUCTOR']),

  // Mi tienda: PROVEEDOR
  item('Mi tienda', 'Mi tienda', '/proveedor/tienda', 'store', ['PROVEEDOR']),
  item('Mi tienda', 'Productos', '/proveedor/productos', 'package', ['PROVEEDOR']),
  item('Mi tienda', 'Pedidos recibidos', '/proveedor/pedidos', 'receipt', ['PROVEEDOR']),

  // Administración: ADMIN
  item('Administración', 'Usuarios', '/admin/usuarios', 'users', ['ADMIN']),
  item('Administración', 'Categorías', '/admin/categorias', 'grid', ['ADMIN']),
  item('Administración', 'Gestión de tiendas', '/admin/tiendas', 'store', ['ADMIN']),
  item('Administración', 'Pedidos', '/admin/pedidos', 'receipt', ['ADMIN']),
  item('Administración', 'Pagos', '/admin/pagos', 'credit-card', ['ADMIN']),

  // Cuenta
  item('Cuenta', 'Iniciar sesión', '/auth/login', 'log-in', ['VISITANTE']),
  item('Cuenta', 'Registrarse', '/auth/registro', 'plus', ['VISITANTE']),
  item('Cuenta', 'Mi cuenta', '/cuenta', 'user', LOGGED),
];
