import { Component } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader, Button, Icon],
  template: `
    <div class="mx-auto max-w-5xl space-y-12 p-4 sm:p-8">
      <section aria-label="Solo título">
        <app-page-header title="Catálogo" />
      </section>

      <section aria-label="Con descripción">
        <app-page-header
          title="Mis pedidos"
          description="Consulta el estado de cada compra y paga los pedidos que esperan pago."
        />
      </section>

      <section aria-label="Con acciones">
        <app-page-header
          title="Productos de mi tienda"
          description="Administra presentaciones, precios y stock."
        >
          <button actions app-button variant="secondary">Importar</button>
          <button actions app-button><app-icon name="plus" size="sm" /> Nuevo producto</button>
        </app-page-header>
      </section>
    </div>
  `,
})
export class PageHeaderDemo {}
