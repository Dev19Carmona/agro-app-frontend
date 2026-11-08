import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing/placeholder-route';

/** Montadas bajo `/pagos`. Pagos del productor autenticado. */
export const PAGOS_ROUTES: Routes = [
  placeholderRoute('', 'Mis pagos', {
    roles: ['PRODUCTOR'],
    description:
      'Historial de pagos con método, monto en COP y estado: pendiente, procesando, aprobado, rechazado o con error.',
    endpoints: ['GET /payments'],
  }),
  placeholderRoute(':id', 'Detalle de pago', {
    roles: ['PRODUCTOR'],
    description: 'Datos del pago, su referencia y, si fue rechazado, el motivo.',
    endpoints: ['GET /payments/:id'],
  }),
];
