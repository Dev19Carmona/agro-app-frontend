import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

const PRODUCTOR: 'PRODUCTOR'[] = ['PRODUCTOR'];

/**
 * Montada bajo `/pedidos/:id/pago` (en `app.routes.ts`, antes de `pedidos`): la pantalla de pago
 * de un pedido pertenece al dominio pagos aunque su URL cuelgue de `/pedidos`.
 */
export const PAGAR_PEDIDO_ROUTES: Routes = [
  {
    ...placeholderRoute('', 'Pagar pedido', {
      roles: PRODUCTOR,
      description:
        'Elección del método (tarjeta, PSE o Nequi) y pago con un token de prueba. Muestra el resultado y permite reintentar tras un rechazo o un error mientras el pedido no venza.',
      endpoints: ['POST /payments', 'GET /payments', 'GET /payments/:id', 'GET /orders/:id'],
    }),
    loadComponent: () => import('./pages/pagar-pedido/pagar-pedido').then((m) => m.PagarPedido),
  },
];

/** Montadas bajo `/pagos`. Pagos del productor autenticado. */
export const PAGOS_ROUTES: Routes = [
  {
    ...placeholderRoute('', 'Mis pagos', {
      roles: PRODUCTOR,
      description:
        'Historial de pagos con método, monto en COP y estado: pendiente, procesando, aprobado, rechazado o con error.',
      endpoints: ['GET /payments'],
    }),
    loadComponent: () => import('./pages/mis-pagos/mis-pagos').then((m) => m.MisPagos),
  },
  {
    ...placeholderRoute(':id', 'Detalle de pago', {
      roles: PRODUCTOR,
      description: 'Datos del pago, su referencia y, si fue rechazado, el motivo.',
      endpoints: ['GET /payments/:id', 'GET /orders/:id'],
    }),
    loadComponent: () => import('./pages/pago-detalle/pago-detalle').then((m) => m.PagoDetalle),
  },
];
