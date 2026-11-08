import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

/** Montadas bajo `/cuenta`. */
export const CUENTA_ROUTES: Routes = [
  {
    ...placeholderRoute('', 'Mi cuenta', {
      roles: ['PRODUCTOR', 'PROVEEDOR', 'ADMIN'],
      description:
        'Datos de la cuenta, cambio de contraseña (exige la actual y cierra todas las sesiones) y cierre de sesión.',
      endpoints: ['GET /auth/me', 'POST /auth/change-password', 'POST /auth/logout'],
    }),
    loadComponent: () => import('./pages/cuenta/cuenta').then((m) => m.Cuenta),
  },
];
