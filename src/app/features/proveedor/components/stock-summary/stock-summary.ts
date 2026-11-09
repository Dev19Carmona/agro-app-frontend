import { Component, booleanAttribute, computed, input } from '@angular/core';

/**
 * Stock de una presentación (o la suma de varias): total, reservado y disponible.
 *
 * - `compact=false` (por defecto): lista de tres datos con su etiqueta.
 * - `compact=true`: una línea, «N disponibles», con total y reservado como texto de apoyo.
 *   Con 0 disponibles dice «Sin stock».
 *
 * Valores por defecto: `compact=false`.
 */
@Component({
  selector: 'app-stock-summary',
  template: `
    @if (compact()) {
      <span class="font-semibold">{{ disponibleText() }}</span>
      <span class="block text-sm text-fg-muted">
        {{ stock() }} en total · {{ reservado() }} reservados
      </span>
    } @else {
      <dl class="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt class="text-fg-muted">Stock total</dt>
          <dd class="font-semibold">{{ stock() }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">Reservado</dt>
          <dd class="font-semibold">{{ reservado() }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">Disponible</dt>
          <dd class="font-semibold">{{ disponible() }}</dd>
        </div>
      </dl>
    }
  `,
  host: { class: 'block' },
})
export class StockSummary {
  readonly stock = input.required<number>();
  readonly reservado = input.required<number>();
  readonly disponible = input.required<number>();
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly disponibleText = computed(() => {
    const n = this.disponible();
    return n <= 0 ? 'Sin stock' : n === 1 ? '1 disponible' : `${n} disponibles`;
  });
}
