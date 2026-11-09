import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { ORDER_STATUSES, OrderStatusBadge, orderStatusLabel } from '../../../../core/orders';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { AdminFilterField, AdminFilters } from '../../components/admin-filters/admin-filters';
import { AdminOrderSummary, AdminOrdersFilter } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { filterQuery, parseOrdersFilter } from '../../utils/filter-params';
import { formatDateTime, shortId } from '../../utils/format';

const FIELDS: readonly AdminFilterField[] = [
  {
    key: 'status',
    label: 'Estado',
    kind: 'select',
    options: [
      { value: '', label: 'Todos los estados' },
      ...ORDER_STATUSES.map((status): SelectOption => ({
        value: status,
        label: orderStatusLabel(status),
      })),
    ],
  },
  {
    key: 'buyerId',
    label: 'Id del comprador',
    kind: 'text',
    objectId: true,
    invalidMessage: 'El id del comprador son 24 caracteres entre 0-9 y a-f',
  },
];

/**
 * `/admin/pedidos`: todos los pedidos (solo lectura), paginados, con fecha, total, estado y comprador
 * (id abreviado con enlace al usuario). `?status=`, `?buyerId=` y `?page=` viven en la URL; los
 * valores inválidos se ignoran y cambiar un filtro reinicia la página.
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Table,
    TableCell,
    Button,
    Pagination,
    AdminFilters,
    OrderStatusBadge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Pedidos"
        description="Todos los pedidos de la plataforma, en solo lectura."
      />

      <app-admin-filters
        ariaLabel="Filtros de pedidos"
        [fields]="fields"
        [values]="values()"
        (valuesChange)="applyFilters($event)"
      />

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
          <ng-template appTableCell="buyerId" let-row>
            <a
              class="font-mono text-sm"
              [routerLink]="['/admin/usuarios', order(row).buyerId]"
              [attr.aria-label]="'Ver al comprador ' + order(row).buyerId"
              >{{ short(order(row).buyerId) }}</a
            >
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/admin/pedidos', order(row).id]"
              [ariaLabel]="'Ver el pedido del ' + date(order(row).createdAt)"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1 || hasFilters()) {
          <a emptyActions app-button variant="secondary" routerLink="/admin/pedidos">
            {{ filter().page > 1 ? 'Ir a la primera página' : 'Quitar los filtros' }}
          </a>
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
export class Pedidos {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseOrdersFilter(this.queryParams()));
  protected readonly values = computed<Record<string, string>>(() => {
    const { status, buyerId } = this.filter();
    const values: Record<string, string> = {};
    if (status) {
      values['status'] = status;
    }
    if (buyerId) {
      values['buyerId'] = buyerId;
    }
    return values;
  });
  protected readonly hasFilters = computed(() => Object.keys(this.values()).length > 0);

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
    if (this.filter().page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay pedidos en esta página. Vuelve a la primera.',
      };
    }
    return this.hasFilters()
      ? {
          title: 'No hay pedidos con estos filtros',
          description: 'Prueba con otro estado u otro comprador, o quita los filtros.',
        }
      : { title: 'Aún no hay pedidos', description: 'Los pedidos aparecerán aquí.' };
  });

  protected readonly fields = FIELDS;
  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;
  protected readonly short = shortId;
  protected readonly columns: TableColumn<AdminOrderSummary>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'total', header: 'Total' },
    { field: 'status', header: 'Estado' },
    { field: 'buyerId', header: 'Comprador' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected order(row: unknown): AdminOrderSummary {
    return row as AdminOrderSummary;
  }

  /** Cambiar un filtro reinicia la página. */
  protected applyFilters(values: Record<string, string>): void {
    this.navigate({ ...parseOrdersFilter({ get: (name) => values[name] ?? null }), page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  private navigate(filter: AdminOrdersFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterQuery(filter) });
  }
}
