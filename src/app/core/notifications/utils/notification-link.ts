import type { SessionRole } from '../../auth';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Ruta de los pedidos recibidos del proveedor (su detalle usa el id del sub-pedido, no el del pedido). */
export const PROVIDER_ORDERS_PATH = '/proveedor/pedidos';

/**
 * Destino de un aviso. Sin `orderId`, o con uno que no sea de 24 hex, no hay enlace (`null`).
 * El `PRODUCTOR` va al detalle de su pedido. El `PROVEEDOR` recibe la lista de pedidos recibidos
 * como destino base: `/proveedor/pedidos/:id` espera el id del sub-pedido y el aviso solo trae el
 * del pedido, así que `NotificationsService.open` busca el sub-pedido y navega a su detalle (y usa
 * esta lista si no lo encuentra). Cualquier otro rol no tiene enlace.
 */
export function notificationLink(orderId: string | null, role: SessionRole): string | null {
  if (!orderId || !OBJECT_ID.test(orderId)) {
    return null;
  }
  if (role === 'PRODUCTOR') {
    return `/pedidos/${orderId}`;
  }
  if (role === 'PROVEEDOR') {
    return PROVIDER_ORDERS_PATH;
  }
  return null;
}
