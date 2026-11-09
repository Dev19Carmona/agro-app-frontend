import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { ProviderSubOrder } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import { formatDateTime } from '../../utils/format-date';
import { pageQuery, parsePage } from '../../utils/page-param';

/**
 * `/proveedor/pedidos`: sub-pedidos pagados de la tienda (siempre `CONFIRMED`), en solo lectura y
 * paginados con `?page=`. Muestra fecha, estado, número de ítems y subtotal; nunca el comprador ni
 * el total del pedido, que el backend no envía.
 */
@Component({
  imports: [PageHeader, ResourceState, Table, TableCell, Badge, Button, Pagination, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Pedidos recibidos"
        description="Pedidos ya pagados que incluyen productos de tu tienda."
      />

      @if (orders.hasValue()) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        [loading]="orders.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="orders.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="createdAt" let-row>
            {{ date(order(row).createdAt) }}
          </ng-template>
          <ng-template appTableCell="status" let-row>
            <app-badge tone="success">Pagado</app-badge>
          </ng-template>
          <ng-template appTableCell="items" let-row>
            {{ itemsText(order(row)) }}
          </ng-template>
          <ng-template appTableCell="subtotal" let-row>
            <span class="font-semibold">{{ cop(order(row).subtotal) }}</span>
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/proveedor/pedidos', order(row).id]"
              [ariaLabel]="'Ver el pedido del ' + date(order(row).createdAt)"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (page() > 1) {
          <a emptyActions app-button variant="secondary" routerLink="/proveedor/pedidos"
            >Ir a la primera página</a
          >
        }
      </app-resource-state>

      <app-pagination
        ariaLabel="Paginación de pedidos recibidos"
        [page]="page()"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class PedidosRecibidos {
  private readonly api = inject(ProveedorApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly page = computed(() => parsePage(this.queryParams().get('page')));

  protected readonly orders = rxResource({
    params: () => ({ page: this.page() }),
    stream: ({ params }) => this.api.listSubOrders(params.page),
  });

  protected readonly error = computed(() => resourceApiError(this.orders.error()));
  protected readonly items = computed(() =>
    this.orders.hasValue() ? this.orders.value().data : [],
  );
  protected readonly totalPages = computed(() =>
    this.orders.hasValue() ? this.orders.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.orders.hasValue() ? this.orders.value().total : 0;
    return total === 1 ? '1 pedido' : `${total} pedidos`;
  });
  protected readonly emptyView = computed(() =>
    this.page() > 1
      ? {
          title: 'Esta página no existe',
          description: 'No hay pedidos en esta página. Vuelve a la primera.',
        }
      : {
          title: 'Aún no has recibido pedidos',
          description: 'Cuando un cliente pague un pedido con tus productos, aparecerá aquí.',
        },
  );

  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;

  protected readonly columns: TableColumn<ProviderSubOrder>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'status', header: 'Estado' },
    { field: 'items', header: 'Ítems' },
    { field: 'subtotal', header: 'Subtotal' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected order(row: unknown): ProviderSubOrder {
    return row as ProviderSubOrder;
  }

  protected itemsText(order: ProviderSubOrder): string {
    const n = order.items.length;
    return n === 1 ? '1 ítem' : `${n} ítems`;
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: pageQuery(page) });
  }
}
