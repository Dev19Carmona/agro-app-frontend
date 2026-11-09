import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicVariant, formatCop } from '../../../../core/catalog';
import { Badge } from '../../../../shared/ui/badge/badge';
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
 * Valores por defecto: `requiresQuote=false`, `showProduct=false`, `productNames=` mapa vacío.
 */
@Component({
  selector: 'app-variants-table',
  imports: [Table, TableCell, Badge, RouterLink],
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
    </app-table>
  `,
  host: { class: 'block' },
})
export class VariantsTable {
  readonly variants = input.required<PublicVariant[]>();
  readonly requiresQuote = input(false);
  readonly showProduct = input(false);
  readonly productNames = input<ReadonlyMap<string, string>>(new Map());

  protected readonly columns = computed<TableColumn<PublicVariant>[]>(() => [
    ...(this.showProduct() ? [{ field: 'productId' as const, header: 'Producto' }] : []),
    { field: 'presentacion', header: 'Presentación' },
    { field: 'unidad', header: 'Unidad' },
    { field: 'precioVigente', header: 'Precio' },
    { field: 'disponible', header: 'Disponibilidad' },
  ]);

  protected readonly format = formatCop;

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected variant(row: unknown): PublicVariant {
    return row as PublicVariant;
  }
}
