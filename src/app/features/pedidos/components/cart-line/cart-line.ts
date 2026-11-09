import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItem, MAX_CART_QUANTITY } from '../../../../core/cart';
import { formatCop } from '../../../../core/catalog';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { FieldErrors } from '../../../../shared/ui/form-control/form-control.types';
import { Input } from '../../../../shared/ui/input/input';

/**
 * Línea del carrito: producto, presentación, precio vigente, cantidad editable, subtotal,
 * disponibilidad y **Quitar**.
 *
 * - La cantidad (entero de 1 a `MAX_CART_QUANTITY`) se confirma con Enter o al salir del campo, y
 *   solo se emite `quantityChange` si es válida y distinta de la actual. Si no es válida se muestra
 *   el error y no se envía nada.
 * - El subtotal es `precioVigente × cantidad` y es solo una ayuda visual: el backend calcula el total.
 * - Una línea no apta (`apta = false`) se marca "No disponible" y no ofrece editar la cantidad.
 *
 * Valores por defecto: `busy=false`.
 */
@Component({
  selector: 'app-cart-line',
  imports: [Badge, Button, Card, Input, RouterLink],
  template: `
    <app-card
      class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      [class.border-danger]="!item().apta"
    >
      <div class="min-w-0 space-y-1 md:flex-1">
        @if (item().productId) {
          <a
            class="font-semibold wrap-break-word"
            [routerLink]="['/catalogo/productos', item().productId]"
            >{{ item().nombreProducto }}</a
          >
        } @else {
          <p class="font-semibold">Producto no disponible</p>
        }
        @if (item().presentacion) {
          <p class="text-sm text-fg-muted wrap-break-word">
            {{ item().presentacion }}@if (item().unidad) {
              · {{ item().unidad }}
            }
          </p>
        }
        <p class="flex flex-wrap items-center gap-2 text-sm">
          @if (!item().apta) {
            <app-badge tone="danger">No disponible</app-badge>
            <span class="text-fg-muted">Quítala para poder continuar.</span>
          } @else if (item().disponible > 0) {
            <span class="text-fg-muted">{{ item().disponible }} disponibles</span>
          } @else {
            <app-badge tone="danger">Sin stock</app-badge>
          }
        </p>
        @if (item().apta && item().cantidad > item().disponible) {
          <p class="text-sm text-warning">
            Supera la disponibilidad actual; el pedido puede ser rechazado.
          </p>
        }
      </div>

      <dl class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:w-56">
        <dt class="text-fg-muted">Precio vigente</dt>
        <dd class="text-right font-semibold">{{ price() }}</dd>
        <dt class="text-fg-muted">Subtotal</dt>
        <dd class="text-right font-semibold">{{ subtotal() }}</dd>
      </dl>

      <div class="flex items-start gap-2 md:w-72 md:justify-end">
        @if (item().apta) {
          <app-input
            class="w-32"
            label="Cantidad"
            type="number"
            [min]="1"
            [max]="maxQuantity"
            [step]="1"
            [disabled]="busy()"
            [value]="draft()"
            [errors]="errors()"
            [touched]="true"
            (valueChange)="draft.set($event === '' ? null : $event)"
            (touch)="commit()"
            (keydown.enter)="commit()"
          />
        }
        <button
          app-button
          class="mt-1"
          variant="secondary"
          size="sm"
          [disabled]="busy()"
          [ariaLabel]="'Quitar del carrito: ' + (item().nombreProducto ?? 'producto no disponible')"
          (click)="remove.emit()"
        >
          Quitar
        </button>
      </div>
    </app-card>
  `,
  host: { class: 'block' },
})
export class CartLine {
  readonly item = input.required<CartItem>();
  readonly busy = input(false);

  /** La cantidad cambió a un valor válido. */
  readonly quantityChange = output<number>();
  /** El productor quiere quitar la línea. */
  readonly remove = output<void>();

  protected readonly maxQuantity = MAX_CART_QUANTITY;
  /** Lo escrito en el campo; vuelve a la cantidad del carrito cuando esta cambia. */
  protected readonly draft = linkedSignal<string | number | null>(() => this.item().cantidad);

  private readonly valid = computed(() => {
    const value = this.draft();
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_CART_QUANTITY;
  });
  protected readonly errors = computed<FieldErrors>(() =>
    this.valid()
      ? []
      : [{ kind: 'cantidad', message: `Ingresa un entero entre 1 y ${MAX_CART_QUANTITY}` }],
  );

  protected readonly price = computed(() => {
    const price = this.item().precioVigente;
    return price === undefined ? '—' : formatCop(price);
  });
  protected readonly subtotal = computed(() => {
    const price = this.item().precioVigente;
    return price === undefined ? '—' : formatCop(price * this.item().cantidad);
  });

  protected commit(): void {
    const value = this.draft();
    if (this.valid() && typeof value === 'number' && value !== this.item().cantidad) {
      this.quantityChange.emit(value);
    }
  }
}
