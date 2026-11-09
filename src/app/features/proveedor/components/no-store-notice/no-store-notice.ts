import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

/** Estado «Aún no tienes una tienda» con enlace a crearla (`/proveedor/tienda`). */
@Component({
  selector: 'app-no-store-notice',
  imports: [EmptyState, Button, RouterLink],
  template: `
    <app-empty-state
      title="Aún no tienes una tienda"
      description="Crea tu tienda para poder publicar productos y recibir pedidos."
      icon="store"
    >
      <a actions app-button routerLink="/proveedor/tienda">Crear mi tienda</a>
    </app-empty-state>
  `,
  host: { class: 'block' },
})
export class NoStoreNotice {}
