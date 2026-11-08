import { Component, input } from '@angular/core';

/**
 * Encabezado de página: `<h1>` en serif, descripción opcional y una zona de acciones.
 * Las acciones se proyectan con el atributo `actions`:
 *
 * ```html
 * <app-page-header title="Pedidos" description="Historial de compras.">
 *   <button actions app-button>Nuevo</button>
 * </app-page-header>
 * ```
 *
 * En pantallas pequeñas las acciones pasan debajo del título.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 space-y-2">
        <h1 class="text-3xl sm:text-4xl">{{ title() }}</h1>
        @if (description()) {
          <p class="max-w-prose text-fg-muted">{{ description() }}</p>
        }
      </div>
      <div class="flex flex-wrap gap-2 empty:hidden">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  host: { class: 'block' },
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
