import { Component } from '@angular/core';
import { Card } from './card';
import { CardPadding } from './card.types';

@Component({
  imports: [Card],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Card (app-card)</h1>

      <section aria-labelledby="card-padding" class="space-y-3">
        <h2 id="card-padding" class="text-xl">Relleno</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          @for (padding of paddings; track padding) {
            <app-card [padding]="padding">
              <p class="font-semibold">padding: {{ padding }}</p>
              <p class="text-fg-muted">Semilla de maíz certificada, bulto de 25 kg.</p>
            </app-card>
          }
        </div>
      </section>

      <section aria-labelledby="card-tone" class="space-y-3">
        <h2 id="card-tone" class="text-xl">Tono</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <app-card>
            <p class="font-semibold">default</p>
            <p class="text-fg-muted">Superficie elevada sobre el fondo de la página.</p>
          </app-card>
          <app-card tone="sunken">
            <p class="font-semibold">sunken</p>
            <p class="text-fg-muted">Fondo hundido para zonas secundarias.</p>
          </app-card>
        </div>
      </section>
    </div>
  `,
})
export class CardDemo {
  protected readonly paddings: CardPadding[] = ['none', 'sm', 'md', 'lg'];
}
