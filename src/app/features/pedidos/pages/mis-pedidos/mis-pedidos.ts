import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { OrderStatusBadge } from '../../components/order-status-badge/order-status-badge';
import { OrderSummary } from '../../models/pedidos.types';
import { PedidosApi } from '../../services/pedidos-api';
import { ordersFilterQuery, parseOrdersFilter } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format-date';
import { ORDER_STATUSES, isOrderStatus, orderStatusLabel } from '../../utils/order-status';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) })),
];

/**
 * `/pedidos`: historial de pedidos propios (el más reciente primero), paginado, con filtro por
 * estado. `?status=` y `?page=` viven en la URL y sobreviven a recargar; los valores inválidos se
 * ignoran y cambiar el filtro reinicia la página.
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Table,
    TableCell,
    Button,
    Pagination,
    Select,
    OrderStatusBadge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Mis pedidos" description="Historial de tus pedidos y su estado.">
        <a actions app-button variant="secondary" routerLink="/catalogo">Ir al catálogo</a>
      </app-page-header>

      <div class="max-w-xs">
        <app-select
          label="Estado"
          [options]="statusOptions"
          [value]="filter().status ?? ''"
          (valueChange)="setStatus($event)"
        />
      </div>

      @if (orders.hasValue()) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        emptyIcon="receipt"
        [loading]="orders.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="orders.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="createdAt" let-row>
            {{ date(order(row).createdAt) }}
          </ng-template>
          <ng-template appTableCell="total" let-row>
            <span class="font-semibold">{{ cop(order(row).total) }}</span>
          </ng-template>
          <ng-template appTableCell="status" let-row>
            <app-order-status-badge [status]="order(row).status" />
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/pedidos', order(row).id]"
              [ariaLabel]="'Ver el pedido del ' + date(order(row).createdAt)"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1) {
          <a emptyActions app-button variant="secondary" routerLink="/pedidos"
            >Ir a la primera página</a
          >
        } @else if (filter().status) {
          <a emptyActions app-button variant="secondary" routerLink="/pedidos"
            >Quitar el filtro</a
          >
        } @else {
          <a emptyActions app-button routerLink="/catalogo">Ver el catálogo</a>
        }
      </app-resource-state>

      <app-pagination
        ariaLabel="Paginación de pedidos"
        [page]="filter().page"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class MisPedidos {
  private readonly api = inject(PedidosApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseOrdersFilter(this.queryParams()));

  protected readonly orders = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listOrders(params),
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
  protected readonly emptyView = computed(() => {
    const { page, status } = this.filter();
    if (page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay pedidos en esta página. Vuelve a la primera.',
      };
    }
    return status
      ? {
          title: 'No hay pedidos con este estado',
          description: 'Prueba con otro estado o quita el filtro.',
        }
      : {
          title: 'Aún no tienes pedidos',
          description: 'Cuando confirmes un pedido desde tu carrito, aparecerá aquí.',
        };
  });

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;

  protected readonly columns: TableColumn<OrderSummary>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'total', header: 'Total' },
    { field: 'status', header: 'Estado' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected order(row: unknown): OrderSummary {
    return row as OrderSummary;
  }

  /** Cambiar el filtro reinicia la página. */
  protected setStatus(value: string): void {
    const status = isOrderStatus(value) ? value : undefined;
    if (status === this.filter().status) {
      return;
    }
    this.navigate({ page: 1, ...(status ? { status } : {}) });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  private navigate(filter: ReturnType<typeof parseOrdersFilter>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: ordersFilterQuery(filter) });
  }
}
