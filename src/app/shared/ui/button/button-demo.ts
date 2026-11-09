import { Component } from '@angular/core';
import { Icon } from '../icon/icon';
import { Button } from './button';
import { ButtonSize, ButtonVariant } from './button.types';

@Component({
  imports: [Button, Icon],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Button (app-button)</h1>

      <section aria-labelledby="btn-variants" class="space-y-3">
        <h2 id="btn-variants" class="text-xl">Variantes</h2>
        <div class="flex flex-wrap gap-3">
          @for (variant of variants; track variant) {
            <button app-button [variant]="variant">{{ variant }}</button>
          }
        </div>
      </section>

      <section aria-labelledby="btn-sizes" class="space-y-3">
        <h2 id="btn-sizes" class="text-xl">Tamaños</h2>
        <div class="flex flex-wrap items-center gap-3">
          @for (size of sizes; track size) {
            <button app-button [size]="size">{{ size }}</button>
          }
        </div>
      </section>

      <section aria-labelledby="btn-icons" class="space-y-3">
        <h2 id="btn-icons" class="text-xl">Con icono</h2>
        <div class="flex flex-wrap items-center gap-3">
          <button app-button><app-icon name="plus" size="sm" /> Agregar al carrito</button>
          <button app-button variant="secondary">
            <app-icon name="arrow-left" size="sm" /> Volver
          </button>
        </div>
      </section>

      <section aria-labelledby="btn-icon-only" class="space-y-3">
        <h2 id="btn-icon-only" class="text-xl">Solo icono</h2>
        <div class="flex flex-wrap items-center gap-3">
          @for (size of sizes; track size) {
            <button app-button variant="secondary" iconOnly [size]="size" ariaLabel="Abrir menú">
              <app-icon name="menu" />
            </button>
          }
          <button app-button variant="ghost" iconOnly ariaLabel="Cambiar tema">
            <app-icon name="moon" />
          </button>
        </div>
      </section>

      <section aria-labelledby="btn-states" class="space-y-3">
        <h2 id="btn-states" class="text-xl">Deshabilitado y enlace</h2>
        <div class="flex flex-wrap items-center gap-3">
          <button app-button disabled>Pagar</button>
          <a app-button variant="secondary" href="/catalogo">Ir al catálogo</a>
        </div>
      </section>
    </div>
  `,
})
export class ButtonDemo {
  protected readonly variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
  protected readonly sizes: ButtonSize[] = ['sm', 'md', 'lg'];
}
