import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { Card } from '../../../../shared/ui/card/card';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { OrderItem, SubOrder } from '../../../../core/orders';

/**
 * Ítems de un pedido por tienda, tal como se compraron (snapshot): nombre, presentación, unidad,
 * precio unitario, cantidad y subtotal. Cada tienda muestra su nombre (`storeNames`, o "Tienda" si
 * no se pudo consultar) y el subtotal que calculó el backend.
 *
 * Valor por defecto: `storeNames=` mapa vacío.
 */
@Component({
  selector: 'app-order-sub-orders',
  imports: [Card, Table, TableCell, RouterLink],
  template: `
    <div class="space-y-4">
      @for (sub of subOrders(); track sub.id; let i = $index) {
        <section [attr.aria-labelledby]="'sub-' + i">
          <app-card class="space-y-3">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 [id]="'sub-' + i" class="text-xl">
                {{ storeNames().get(sub.storeId) ?? 'Tienda' }}
              </h2>
              <p class="text-sm text-fg-muted">
                Subtotal de la tienda:
                <span class="font-semibold text-fg">{{ cop(sub.subtotal) }}</span>
              </p>
            </div>
            <app-table [data]="sub.items" [columns]="columns">
              <ng-template appTableCell="nombreProducto" let-row>
                <a [routerLink]="['/catalogo/productos', item(row).productId]">{{
                  item(row).nombreProducto
                }}</a>
              </ng-template>
              <ng-template appTableCell="presentacion" let-row>
                {{ item(row).presentacion }} · {{ item(row).unidad }}
              </ng-template>
              <ng-template appTableCell="precioUnitario" let-row>
                {{ cop(item(row).precioUnitario) }}
              </ng-template>
              <ng-template appTableCell="subtotal" let-row>
                <span class="font-semibold">{{ cop(item(row).subtotal) }}</span>
              </ng-template>
            </app-table>
          </app-card>
        </section>
      }
    </div>
  `,
  host: { class: 'block' },
})
export class OrderSubOrders {
  readonly subOrders = input.required<SubOrder[]>();
  readonly storeNames = input<ReadonlyMap<string, string>>(new Map());

  protected readonly cop = formatCop;

  protected readonly columns: TableColumn<OrderItem>[] = [
    { field: 'nombreProducto', header: 'Producto' },
    { field: 'presentacion', header: 'Presentación' },
    { field: 'precioUnitario', header: 'Precio unitario' },
    { field: 'cantidad', header: 'Cantidad' },
    { field: 'subtotal', header: 'Subtotal' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected item(row: unknown): OrderItem {
    return row as OrderItem;
  }
}
