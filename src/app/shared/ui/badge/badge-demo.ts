import { Component } from '@angular/core';
import { Badge } from './badge';
import { BadgeTone } from './badge.types';

@Component({
  imports: [Badge],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Badge (app-badge)</h1>

      <section aria-labelledby="badge-tones" class="space-y-3">
        <h2 id="badge-tones" class="text-xl">Tonos</h2>
        <div class="flex flex-wrap gap-3">
          @for (tone of tones; track tone) {
            <app-badge [tone]="tone">{{ tone }}</app-badge>
          }
        </div>
      </section>

      <section aria-labelledby="badge-states" class="space-y-3">
        <h2 id="badge-states" class="text-xl">Estados de negocio</h2>
        <div class="flex flex-wrap gap-3">
          <app-badge tone="info">Esperando pago</app-badge>
          <app-badge tone="success">Confirmado</app-badge>
          <app-badge tone="danger">Cancelado</app-badge>
          <app-badge tone="warning">Pendiente de aprobación</app-badge>
          <app-badge>Deshabilitado</app-badge>
        </div>
      </section>
    </div>
  `,
})
export class BadgeDemo {
  protected readonly tones: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'info'];
}
