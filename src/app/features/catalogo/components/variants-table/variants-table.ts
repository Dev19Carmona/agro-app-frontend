import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_CART_QUANTITY } from '../../../../core/cart';
import { PublicVariant, formatCop } from '../../../../core/catalog';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { FieldErrors } from '../../../../shared/ui/form-control/form-control.types';
import { Input } from '../../../../shared/ui/input/input';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';

/**
 * Presentaciones de un producto: presentación, unidad, precio vigente y disponibilidad.
 *
 * - Con oferta se muestra el precio vigente y, tachado, el anterior (con el texto accesible
 *   "Precio anterior").
 * - `disponible = 0` muestra el badge "Sin stock"; la presentación no se oculta.
 * - Un producto `requiresQuote` muestra "Precio a cotizar" en lugar del precio.
 * - Con `showProduct` añade una primera columna "Producto" con un enlace al detalle: el nombre si
 *   está en `productNames` y, si no (aún carga o falló su consulta), "Ver producto". Es lo que
 *   usa la pantalla de ofertas, donde las presentaciones vienen de productos distintos.
 *
 * - Con `canBuy` (un `PRODUCTOR` ante un producto que no es a cotizar) las presentaciones con stock
 *   añaden una columna con la cantidad (entero de 1 a `MAX_CART_QUANTITY`, 1 por defecto) y el botón
 *   **Agregar al carrito**, que emite `addToCart`. Pedir más que `disponible` solo avisa: el
 *   backend valida el stock después. `busyVariantId` deshabilita el botón de esa presentación.
 *
 * Valores por defecto: `requiresQuote=false`, `showProduct=false`, `productNames=` mapa vacío,
 * `canBuy=false`, `busyVariantId=null`.
 */
@Component({
  selector: 'app-variants-table',
  imports: [Table, TableCell, Badge, Button, Input, RouterLink],
  template: `
    <app-table [data]="variants()" [columns]="columns()">
      <ng-template appTableCell="productId" let-row>
        <a [routerLink]="['/catalogo/productos', variant(row).productId]">
          {{ productNames().get(variant(row).productId) ?? 'Ver producto' }}
        </a>
      </ng-template>
      <ng-template appTableCell="precioVigente" let-row>
        @if (requiresQuote()) {
          <span class="font-semibold">Precio a cotizar</span>
        } @else {
          <span class="flex flex-wrap items-baseline gap-x-2">
            <span class="font-semibold">{{ format(variant(row).precioVigente) }}</span>
            @if (variant(row).precioOferta !== undefined) {
              <span class="text-sm text-fg-muted">
                <span class="sr-only">Precio anterior: </span>
                <s>{{ format(variant(row).precio) }}</s>
              </span>
            }
          </span>
        }
      </ng-template>
      <ng-template appTableCell="disponible" let-row>
        @if (variant(row).disponible > 0) {
          {{ variant(row).disponible }} disponibles
        } @else {
          <app-badge tone="danger">Sin stock</app-badge>
        }
      </ng-template>
      <ng-template appTableCell="id" let-row>
        @if (variant(row).disponible > 0) {
          <div class="flex min-w-56 items-start gap-2 py-2">
            <app-input
              class="w-28"
              label="Cantidad"
              type="number"
              [min]="1"
              [max]="maxQuantity"
              [step]="1"
              [hint]="exceeds(variant(row)) ? 'Supera la disponibilidad actual' : null"
              [value]="quantity(variant(row))"
              [errors]="errorsFor(variant(row))"
              [touched]="true"
              (valueChange)="setQuantity(variant(row), $event)"
            />
            <button
              app-button
              class="mt-1"
              size="sm"
              [disabled]="busyVariantId() === variant(row).id || !isValid(variant(row))"
              [ariaLabel]="'Agregar al carrito: ' + variant(row).presentacion"
              (click)="add(variant(row))"
            >
              Agregar al carrito
            </button>
          </div>
        }
      </ng-template>
    </app-table>
  `,
  host: { class: 'block' },
})
export class VariantsTable {
  readonly variants = input.required<PublicVariant[]>();
  readonly requiresQuote = input(false);
  readonly showProduct = input(false);
  readonly productNames = input<ReadonlyMap<string, string>>(new Map());
  readonly canBuy = input(false);
  readonly busyVariantId = input<string | null>(null);

  /** El productor pidió agregar `cantidad` unidades de la presentación `variantId`. */
  readonly addToCart = output<{ variantId: string; cantidad: number }>();

  protected readonly maxQuantity = MAX_CART_QUANTITY;
  private readonly quantities = signal<ReadonlyMap<string, number | null>>(new Map());

  protected readonly columns = computed<TableColumn<PublicVariant>[]>(() => [
    ...(this.showProduct() ? [{ field: 'productId' as const, header: 'Producto' }] : []),
    { field: 'presentacion', header: 'Presentación' },
    { field: 'unidad', header: 'Unidad' },
    { field: 'precioVigente', header: 'Precio' },
    { field: 'disponible', header: 'Disponibilidad' },
    ...(this.canBuy() ? [{ field: 'id' as const, header: 'Comprar' }] : []),
  ]);

  protected readonly format = formatCop;

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected variant(row: unknown): PublicVariant {
    return row as PublicVariant;
  }

  /** Cantidad escrita para la presentación (1 si aún no se tocó). */
  protected quantity(variant: PublicVariant): number | null {
    const map = this.quantities();
    return map.has(variant.id) ? (map.get(variant.id) ?? null) : 1;
  }

  protected setQuantity(variant: PublicVariant, value: string | number | null): void {
    const next = typeof value === 'number' ? value : null;
    this.quantities.update((map) => new Map(map).set(variant.id, next));
  }

  protected isValid(variant: PublicVariant): boolean {
    const quantity = this.quantity(variant);
    return (
      quantity !== null &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= MAX_CART_QUANTITY
    );
  }

  protected exceeds(variant: PublicVariant): boolean {
    const quantity = this.quantity(variant);
    return this.isValid(variant) && quantity !== null && quantity > variant.disponible;
  }

  protected errorsFor(variant: PublicVariant): FieldErrors {
    return this.isValid(variant)
      ? []
      : [{ kind: 'cantidad', message: `Entero entre 1 y ${MAX_CART_QUANTITY}` }];
  }

  protected add(variant: PublicVariant): void {
    const cantidad = this.quantity(variant);
    if (cantidad !== null && this.isValid(variant)) {
      this.addToCart.emit({ variantId: variant.id, cantidad });
    }
  }
}
