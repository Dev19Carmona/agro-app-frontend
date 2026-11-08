import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

/** Montadas bajo `/auth`, dentro de `AuthLayout` (sin header ni panel). */
export const AUTH_ROUTES: Routes = [
  {
    ...placeholderRoute('login', 'Iniciar sesión', {
      roles: ['VISITANTE'],
      description:
        'Formulario de correo y contraseña. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos; una cuenta pendiente, rechazada o deshabilitada se informa solo con la contraseña correcta.',
      endpoints: ['POST /auth/login'],
    }),
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    ...placeholderRoute('registro', 'Crear cuenta', {
      roles: ['VISITANTE'],
      description:
        'Registro como productor o proveedor (nunca administrador), con aceptación del tratamiento de datos. Un proveedor queda pendiente hasta que un administrador apruebe su solicitud.',
      endpoints: ['POST /auth/register'],
    }),
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
];
