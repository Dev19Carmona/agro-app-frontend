import { Component } from '@angular/core';
import { Button } from '../button/button';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState, Button],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Empty state (app-empty-state)</h1>

      <section aria-labelledby="empty-cart" class="space-y-3">
        <h2 id="empty-cart" class="text-xl">Con acción</h2>
        <app-empty-state
          title="Tu carrito está vacío"
          description="Agrega productos del catálogo para armar tu pedido."
          icon="cart"
          [headingLevel]="3"
        >
          <a actions app-button href="/catalogo">Ver catálogo</a>
        </app-empty-state>
      </section>

      <section aria-labelledby="empty-plain" class="space-y-3">
        <h2 id="empty-plain" class="text-xl">Solo título</h2>
        <app-empty-state title="Aún no hay pagos" icon="credit-card" [headingLevel]="3" />
      </section>

      <section aria-labelledby="empty-default" class="space-y-3">
        <h2 id="empty-default" class="text-xl">Icono por defecto</h2>
        <app-empty-state
          title="No hay resultados"
          description="Prueba con otra categoría o quita los filtros."
          [headingLevel]="3"
        />
      </section>
    </div>
  `,
})
export class EmptyStateDemo {}
