import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

/** Montadas bajo `/notificaciones`. Avisos del productor y del proveedor autenticados. */
export const NOTIFICACIONES_ROUTES: Routes = [
  {
    ...placeholderRoute('', 'Notificaciones', {
      roles: ['PRODUCTOR', 'PROVEEDOR'],
      description:
        'Historial de avisos (pagos, pedidos y cuenta) con Cargar más por cursor, filtro Todas o No leídas y marcado como leído.',
      endpoints: [
        'GET /notifications',
        'GET /notifications/unread-count',
        'PATCH /notifications/:id/read',
        'POST /notifications/read-all',
      ],
    }),
    loadComponent: () =>
      import('./pages/notificaciones/notificaciones').then((m) => m.Notificaciones),
  },
];
