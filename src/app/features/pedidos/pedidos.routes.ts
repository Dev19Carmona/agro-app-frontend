import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

const PRODUCTOR: 'PRODUCTOR'[] = ['PRODUCTOR'];

/**
 * Compras del productor: carrito, checkout y pedidos. Se montan en la raíz (`/carrito`,
 * `/checkout`, `/pedidos…`) porque son tres rutas de primer nivel de un mismo flujo.
 * `/pedidos/:id/pago` vive en `features/pagos` (SPEC 08).
 */
export const PEDIDOS_ROUTES: Routes = [
  {
    ...placeholderRoute('carrito', 'Carrito', {
      roles: PRODUCTOR,
      description:
        'Líneas del carrito (máximo 50, de 1 a 1000 unidades cada una) con precio y disponibilidad leídos del catálogo, y total estimado.',
      endpoints: [
        'GET /orders/cart',
        'PUT /orders/cart/items/:variantId',
        'DELETE /orders/cart/items/:variantId',
        'DELETE /orders/cart',
      ],
    }),
    loadComponent: () => import('./pages/carrito/carrito').then((m) => m.Carrito),
  },
  {
    ...placeholderRoute('checkout', 'Confirmar pedido', {
      roles: PRODUCTOR,
      description:
        'Resumen del pedido dividido por tienda y confirmación. El precio se toma siempre del catálogo; el envío usa una clave de idempotencia.',
      endpoints: ['POST /orders/checkout'],
    }),
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    ...placeholderRoute('pedidos', 'Mis pedidos', {
      roles: PRODUCTOR,
      description:
        'Historial de pedidos con su estado: pendiente, esperando pago, confirmado o cancelado.',
      endpoints: ['GET /orders'],
    }),
    loadComponent: () => import('./pages/mis-pedidos/mis-pedidos').then((m) => m.MisPedidos),
  },
  {
    ...placeholderRoute('pedidos/:id', 'Detalle de pedido', {
      roles: PRODUCTOR,
      description:
        'Ítems con su snapshot (nombre, presentación y precio), sub-pedidos por tienda, estado y tiempo restante para pagar (15 minutos).',
      endpoints: ['GET /orders/:id'],
    }),
    loadComponent: () =>
      import('./pages/pedido-detalle/pedido-detalle').then((m) => m.PedidoDetalle),
  },
];
