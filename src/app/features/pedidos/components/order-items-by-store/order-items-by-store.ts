import { Component, computed, input, output } from '@angular/core';
import { CartItem } from '../../../../core/cart';
import { formatCop } from '../../../../core/catalog';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';

/** Nombre que se muestra cuando no se pudo consultar el de la tienda. */
export const STORE_FALLBACK_NAME = 'Tienda';

interface StoreGroup {
  key: string;
  name: string;
  items: CartItem[];
}

/**
 * Resumen del carrito dividido por tienda. El nombre sale de `storeNames` (por `storeId`); si falta
 * se muestra "Tienda". Las líneas de `invalidIds` se marcan "No se puede comprar" y ofrecen
 * **Quitar** (emite `removeLine`). El subtotal de línea es `precioVigente × cantidad`, solo como ayuda
 * visual: el backend calcula el total.
 *
 * Valores por defecto: `storeNames=` mapa vacío, `invalidIds=` conjunto vacío, `busy=false`.
 */
@Component({
  selector: 'app-order-items-by-store',
  imports: [Badge, Button, Card],
  template: `
    <div class="space-y-4">
      @for (group of groups(); track group.key) {
        <section [attr.aria-labelledby]="'tienda-' + $index">
          <app-card class="space-y-3">
            <h2 [id]="'tienda-' + $index" class="text-xl">{{ group.name }}</h2>
            <ul class="divide-y divide-line">
              @for (item of group.items; track item.variantId) {
                <li class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
                  <div class="min-w-0 space-y-1">
                    <p class="font-semibold wrap-break-word">
                      {{ item.nombreProducto ?? 'Producto no disponible' }}
                    </p>
                    @if (item.presentacion) {
                      <p class="text-sm text-fg-muted wrap-break-word">
                        {{ item.presentacion }}@if (item.unidad) {
                          · {{ item.unidad }}
                        }
                      </p>
                    }
                    @if (isInvalid(item)) {
                      <p class="flex flex-wrap items-center gap-2">
                        <app-badge tone="danger">No se puede comprar</app-badge>
                        <button
                          app-button
                          variant="secondary"
                          size="sm"
                          [disabled]="busy()"
                          [ariaLabel]="
                            'Quitar del pedido: ' + (item.nombreProducto ?? 'producto no disponible')
                          "
                          (click)="removeLine.emit(item.variantId)"
                        >
                          Quitar
                        </button>
                      </p>
                    }
                  </div>
                  <p class="text-right text-sm">
                    <span class="text-fg-muted"
                      >{{ item.cantidad }} × {{ price(item.precioVigente) }}</span
                    ><br />
                    <span class="font-semibold">{{ subtotal(item) }}</span>
                  </p>
                </li>
              }
            </ul>
          </app-card>
        </section>
      }
    </div>
  `,
  host: { class: 'block' },
})
export class OrderItemsByStore {
  readonly items = input.required<CartItem[]>();
  readonly storeNames = input<ReadonlyMap<string, string>>(new Map());
  readonly invalidIds = input<ReadonlySet<string>>(new Set());
  readonly busy = input(false);

  /** El productor quiere quitar una línea que no se puede comprar. */
  readonly removeLine = output<string>();

  protected readonly groups = computed<StoreGroup[]>(() => {
    const byStore = new Map<string, CartItem[]>();
    for (const item of this.items()) {
      const key = item.storeId ?? '';
      byStore.set(key, [...(byStore.get(key) ?? []), item]);
    }
    return [...byStore].map(([key, items]) => ({
      key,
      name: this.storeNames().get(key) ?? STORE_FALLBACK_NAME,
      items,
    }));
  });

  protected isInvalid(item: CartItem): boolean {
    return !item.apta || this.invalidIds().has(item.variantId);
  }

  protected price(value: number | undefined): string {
    return value === undefined ? '—' : formatCop(value);
  }

  protected subtotal(item: CartItem): string {
    return item.precioVigente === undefined ? '—' : formatCop(item.precioVigente * item.cantidad);
  }
}
