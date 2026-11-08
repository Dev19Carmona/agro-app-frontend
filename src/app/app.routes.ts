import { Routes } from '@angular/router';

/**
 * Árbol de rutas del MVP. Todo es lazy: cada dominio se carga con `loadChildren` y cada pantalla
 * con `loadComponent`. Por ahora las pantallas de negocio son placeholders (ver `features/*`).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },

  {
    path: 'catalogo',
    loadChildren: () => import('./features/catalogo/catalogo.routes').then((m) => m.CATALOGO_ROUTES),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'cuenta',
    loadChildren: () => import('./features/cuenta/cuenta.routes').then((m) => m.CUENTA_ROUTES),
  },
  {
    // Carrito, checkout y pedidos son rutas de primer nivel: `/carrito`, `/checkout`, `/pedidos…`.
    path: '',
    loadChildren: () => import('./features/pedidos/pedidos.routes').then((m) => m.PEDIDOS_ROUTES),
  },
  {
    path: 'pagos',
    loadChildren: () => import('./features/pagos/pagos.routes').then((m) => m.PAGOS_ROUTES),
  },
  {
    path: 'proveedor',
    loadChildren: () =>
      import('./features/proveedor/proveedor.routes').then((m) => m.PROVEEDOR_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // Demos de componentes de UI (`shared/ui`).
  {
    path: 'ui/table',
    loadComponent: () => import('./shared/ui/table/table-demo').then((m) => m.TableDemo),
  },
  {
    path: 'ui/icon',
    loadComponent: () => import('./shared/ui/icon/icon-demo').then((m) => m.IconDemo),
  },
  {
    path: 'ui/button',
    loadComponent: () => import('./shared/ui/button/button-demo').then((m) => m.ButtonDemo),
  },
  {
    path: 'ui/badge',
    loadComponent: () => import('./shared/ui/badge/badge-demo').then((m) => m.BadgeDemo),
  },
  {
    path: 'ui/card',
    loadComponent: () => import('./shared/ui/card/card-demo').then((m) => m.CardDemo),
  },
  {
    path: 'ui/page-header',
    loadComponent: () =>
      import('./shared/ui/page-header/page-header-demo').then((m) => m.PageHeaderDemo),
  },
  {
    path: 'ui/menu',
    loadComponent: () => import('./shared/ui/menu/menu-demo').then((m) => m.MenuDemo),
  },
  {
    path: 'ui/drawer',
    loadComponent: () => import('./shared/ui/drawer/drawer-demo').then((m) => m.DrawerDemo),
  },
  {
    path: 'ui/empty-state',
    loadComponent: () =>
      import('./shared/ui/empty-state/empty-state-demo').then((m) => m.EmptyStateDemo),
  },

  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./core/routing/not-found').then((m) => m.NotFound),
  },
];
