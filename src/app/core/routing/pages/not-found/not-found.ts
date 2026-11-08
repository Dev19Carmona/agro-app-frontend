import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { PageHeader } from '../../shared/ui/page-header/page-header';

/** Página 404: cualquier URL que no coincide con una ruta. */
@Component({
  imports: [PageHeader, Button, RouterLink],
  template: `
    <app-page-header
      title="No encontramos esta página"
      description="La dirección no existe o cambió de lugar. Vuelve al catálogo para seguir explorando."
    >
      <a actions app-button routerLink="/catalogo">Ir al catálogo</a>
    </app-page-header>
  `,
})
export class NotFound {}
