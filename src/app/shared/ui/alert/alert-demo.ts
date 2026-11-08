import { Component } from '@angular/core';
import { Alert } from './alert';

@Component({
  imports: [Alert],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Alert (app-alert)</h1>

      <section aria-labelledby="alert-variants" class="space-y-3">
        <h2 id="alert-variants" class="text-xl">Variantes</h2>
        <app-alert variant="danger">Credenciales inválidas</app-alert>
        <app-alert variant="info">Tu sesión expiró. Inicia sesión de nuevo.</app-alert>
        <app-alert variant="success">Tu contraseña cambió. Inicia sesión con la nueva.</app-alert>
      </section>

      <section aria-labelledby="alert-title" class="space-y-3">
        <h2 id="alert-title" class="text-xl">Con título</h2>
        <app-alert variant="info" title="Solicitud pendiente">
          Un administrador revisará tu cuenta de proveedor antes de que puedas iniciar sesión.
        </app-alert>
      </section>

      <section aria-labelledby="alert-roles" class="space-y-2">
        <h2 id="alert-roles" class="text-xl">Anuncio a lectores de pantalla</h2>
        <p class="text-fg-muted">
          <code>danger</code> usa <code>role="alert"</code>; <code>info</code> y
          <code>success</code> usan <code>role="status"</code>.
        </p>
      </section>
    </div>
  `,
})
export class AlertDemo {}
