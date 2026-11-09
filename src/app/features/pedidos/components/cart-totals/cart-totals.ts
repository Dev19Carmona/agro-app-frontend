import { Component, computed, input, output } from '@angular/core';
import { formatCop } from '../../../../core/catalog';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';

/**
 * Resumen del carrito: total estimado (el del backend, que solo suma las líneas aptas), **Vaciar
 * carrito** y **Continuar**. `Continuar` se deshabilita con el carrito vacío o con líneas no aptas.
 *
 * Valores por defecto: `lines=0`, `blocked=false`, `busy=false`.
 */
@Component({
  selector: 'app-cart-totals',
  imports: [Button, Card],
  template: `
    <app-card class="space-y-4">
      <p class="flex items-baseline justify-between gap-4">
        <span class="text-fg-muted">Total estimado ({{ linesText() }})</span>
        <span class="text-2xl font-semibold">{{ cop(total()) }}</span>
      </p>
      <p class="text-sm text-fg-muted">
        El precio final se toma del catálogo al confirmar el pedido.
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <button app-button variant="secondary" [disabled]="busy() || lines() === 0" (click)="clear.emit()">
          Vaciar carrito
        </button>
        <button
          app-button
          [disabled]="busy() || blocked() || lines() === 0"
          (click)="proceed.emit()"
        >
          Continuar
        </button>
      </div>
    </app-card>
  `,
  host: { class: 'block' },
})
export class CartTotals {
  readonly total = input.required<number>();
  readonly lines = input(0);
  readonly blocked = input(false);
  readonly busy = input(false);

  readonly clear = output<void>();
  readonly proceed = output<void>();

  protected readonly cop = formatCop;
  protected readonly linesText = computed(() =>
    this.lines() === 1 ? '1 línea' : `${this.lines()} líneas`,
  );
}
