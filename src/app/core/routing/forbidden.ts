import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

/** `/acceso-denegado`: hay sesión, pero el rol no permite ver la pantalla pedida. */
@Component({
  imports: [EmptyState, Button, RouterLink],
  template: `
    <h1 class="sr-only">Acceso denegado</h1>
    <app-empty-state
      icon="shield"
      title="No tienes acceso a esta página"
      description="Tu rol no permite ver esta pantalla. Si crees que es un error, inicia sesión con otra cuenta."
    >
      <a actions app-button routerLink="/catalogo">Ir al catálogo</a>
    </app-empty-state>
  `,
})
export class Forbidden {}
