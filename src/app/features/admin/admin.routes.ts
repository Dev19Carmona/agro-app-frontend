import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

const ADMIN: 'ADMIN'[] = ['ADMIN'];

/** Montadas bajo `/admin`. Todo es de solo lectura salvo usuarios, categorías y tiendas. */
export const ADMIN_ROUTES: Routes = [
  {
    ...placeholderRoute('usuarios', 'Usuarios', {
      roles: ADMIN,
      description:
        'Lista de cuentas con su rol y estado: pendiente de aprobación, activa, rechazada o deshabilitada.',
      endpoints: ['GET /auth/users'],
    }),
    loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
  },
  {
    ...placeholderRoute('usuarios/:id', 'Detalle de usuario', {
      roles: ADMIN,
      description:
        'Aprobar o rechazar a un proveedor pendiente, deshabilitar o habilitar una cuenta y cambiar su rol. Un administrador no puede deshabilitarse ni cambiarse el rol a sí mismo.',
      endpoints: [
        'GET /auth/users/:id',
        'POST /auth/users/:id/approve',
        'POST /auth/users/:id/reject',
        'POST /auth/users/:id/disable',
        'POST /auth/users/:id/enable',
        'PATCH /auth/users/:id/role',
      ],
    }),
    loadComponent: () =>
      import('./pages/usuario-detalle/usuario-detalle').then((m) => m.UsuarioDetalle),
  },
  {
    ...placeholderRoute('categorias', 'Categorías', {
      roles: ADMIN,
      description:
        'Crear y renombrar categorías (el nombre es único sin distinguir mayúsculas ni tildes) y activarlas o desactivarlas.',
      endpoints: [
        'GET /catalog/admin/categories',
        'POST /catalog/categories',
        'PATCH /catalog/categories/:id',
      ],
    }),
    loadComponent: () => import('./pages/categorias/categorias').then((m) => m.Categorias),
  },
  {
    ...placeholderRoute('tiendas', 'Gestión de tiendas', {
      roles: ADMIN,
      description: 'Todas las tiendas, activas e inactivas.',
      endpoints: ['GET /catalog/admin/stores'],
    }),
    loadComponent: () => import('./pages/tiendas/tiendas').then((m) => m.Tiendas),
  },
  {
    ...placeholderRoute('tiendas/:id', 'Detalle de tienda (admin)', {
      roles: ADMIN,
      description:
        'Edición de los datos de la tienda y desactivación. Una tienda desactivada no se reactiva, para no afectar pedidos históricos.',
      endpoints: [
        'GET /catalog/admin/stores/:id',
        'PATCH /catalog/admin/stores/:id',
        'POST /catalog/admin/stores/:id/deactivate',
      ],
    }),
    loadComponent: () =>
      import('./pages/tienda-detalle/tienda-detalle').then((m) => m.TiendaDetalle),
  },
  {
    ...placeholderRoute('pedidos', 'Pedidos (admin)', {
      roles: ADMIN,
      description: 'Todos los pedidos en solo lectura, con filtros por estado y comprador.',
      endpoints: ['GET /orders/admin'],
    }),
    loadComponent: () => import('./pages/pedidos/pedidos').then((m) => m.Pedidos),
  },
  {
    ...placeholderRoute('pedidos/:id', 'Detalle de pedido (admin)', {
      roles: ADMIN,
      description: 'Pedido completo con sus sub-pedidos e ítems, en solo lectura.',
      endpoints: ['GET /orders/admin/:id', 'GET /catalog/admin/stores/:id'],
    }),
    loadComponent: () =>
      import('./pages/pedido-detalle/pedido-detalle').then((m) => m.PedidoDetalle),
  },
  {
    ...placeholderRoute('pagos', 'Pagos (admin)', {
      roles: ADMIN,
      description: 'Todos los pagos en solo lectura, con filtros por estado, comprador y pedido.',
      endpoints: ['GET /payments/admin'],
    }),
    loadComponent: () => import('./pages/pagos/pagos').then((m) => m.Pagos),
  },
  {
    ...placeholderRoute('pagos/:id', 'Detalle de pago (admin)', {
      roles: ADMIN,
      description: 'Pago con el historial de intentos de cobro.',
      endpoints: ['GET /payments/admin/:id'],
    }),
    loadComponent: () => import('./pages/pago-detalle/pago-detalle').then((m) => m.PagoDetalle),
  },
];
