import { Routes } from '@angular/router';
import { accessGuard } from './core/routing';

/**
 * Árbol de rutas del MVP. Todo es lazy: cada dominio se carga con `loadChildren` y cada pantalla
 * con `loadComponent`. Por ahora las pantallas de negocio son placeholders (ver `features/*`).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },

  {
    // Login y registro: pantalla completa, sin header ni panel (`AuthLayout`).
    path: 'auth',
    loadComponent: () => import('./core/layout/components/auth-layout/auth-layout').then((m) => m.AuthLayout),
    canActivateChild: [accessGuard],
    loadChildren: () => import('./features/auth').then((m) => m.AUTH_ROUTES),
  },

  {
    // Ruta layout: header, panel y contenido (`AppShell`).
    path: '',
    loadComponent: () => import('./core/layout/components/app-shell/app-shell').then((m) => m.AppShell),
    canActivateChild: [accessGuard],
    children: [
      {
        path: 'catalogo',
        loadChildren: () =>
          import('./features/catalogo').then((m) => m.CATALOGO_ROUTES),
      },
      {
        path: 'cuenta',
        loadChildren: () => import('./features/cuenta').then((m) => m.CUENTA_ROUTES),
      },
      {
        // Carrito, checkout y pedidos son rutas de primer nivel: `/carrito`, `/checkout`, `/pedidos…`.
        path: '',
        loadChildren: () =>
          import('./features/pedidos').then((m) => m.PEDIDOS_ROUTES),
      },
      {
        path: 'pagos',
        loadChildren: () => import('./features/pagos').then((m) => m.PAGOS_ROUTES),
      },
      {
        path: 'proveedor',
        loadChildren: () =>
          import('./features/proveedor').then((m) => m.PROVEEDOR_ROUTES),
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin').then((m) => m.ADMIN_ROUTES),
      },

      // Acceso denegado: sin `data.roles`, el guard no lo comprueba.
      {
        path: 'acceso-denegado',
        title: 'Acceso denegado',
        loadComponent: () => import('./core/routing/pages/forbidden/forbidden').then((m) => m.Forbidden),
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
        path: 'ui/input',
        loadComponent: () => import('./shared/ui/input/input-demo').then((m) => m.InputDemo),
      },
      {
        path: 'ui/select',
        loadComponent: () => import('./shared/ui/select/select-demo').then((m) => m.SelectDemo),
      },
      {
        path: 'ui/checkbox',
        loadComponent: () =>
          import('./shared/ui/checkbox/checkbox-demo').then((m) => m.CheckboxDemo),
      },
      {
        path: 'ui/alert',
        loadComponent: () => import('./shared/ui/alert/alert-demo').then((m) => m.AlertDemo),
      },
      {
        path: 'ui/empty-state',
        loadComponent: () =>
          import('./shared/ui/empty-state/empty-state-demo').then((m) => m.EmptyStateDemo),
      },

      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('./core/routing/pages/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
