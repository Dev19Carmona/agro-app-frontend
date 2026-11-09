import { Component, input } from '@angular/core';
import { formatCop } from '../../../../core/catalog';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { ProviderOrderItem } from '../../models/proveedor.types';

/**
 * Ítems de un sub-pedido tal como se compraron (snapshot): nombre del producto, presentación,
 * precio unitario, cantidad y subtotal. Los importes salen con `formatCop`.
 */
@Component({
  selector: 'app-sub-order-items',
  imports: [Table, TableCell],
  template: `
    <app-table [data]="items()" [columns]="columns">
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
  `,
  host: { class: 'block' },
})
export class SubOrderItems {
  readonly items = input.required<ProviderOrderItem[]>();

  protected readonly cop = formatCop;

  protected readonly columns: TableColumn<ProviderOrderItem>[] = [
    { field: 'nombreProducto', header: 'Producto' },
    { field: 'presentacion', header: 'Presentación' },
    { field: 'precioUnitario', header: 'Precio unitario' },
    { field: 'cantidad', header: 'Cantidad' },
    { field: 'subtotal', header: 'Subtotal' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected item(row: unknown): ProviderOrderItem {
    return row as ProviderOrderItem;
  }
}
