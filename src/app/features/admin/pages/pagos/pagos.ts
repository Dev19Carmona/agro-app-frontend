import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import {
  PAYMENT_STATUSES,
  PaymentStatusBadge,
  paymentMethodLabel,
  paymentStatusLabel,
} from '../../../../core/payments';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { AdminFilterField, AdminFilters } from '../../components/admin-filters/admin-filters';
import { AdminPayment, AdminPaymentsFilter } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { filterQuery, parsePaymentsFilter } from '../../utils/filter-params';
import { formatDateTime, shortId } from '../../utils/format';
import { paymentsError } from '../../utils/payments-error';

const FIELDS: readonly AdminFilterField[] = [
  {
    key: 'status',
    label: 'Estado',
    kind: 'select',
    options: [
      { value: '', label: 'Todos los estados' },
      ...PAYMENT_STATUSES.map((status): SelectOption => ({
        value: status,
        label: paymentStatusLabel(status),
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
  {
    key: 'orderId',
    label: 'Id del pedido',
    kind: 'text',
    objectId: true,
    invalidMessage: 'El id del pedido son 24 caracteres entre 0-9 y a-f',
  },
];

/**
 * `/admin/pagos`: todos los pagos (solo lectura), paginados, con fecha, método, monto, estado y
 * comprador. `?status=`, `?buyerId=`, `?orderId=` y `?page=` viven en la URL; los valores inválidos
 * se ignoran y cambiar un filtro reinicia la página. El backend limita estas consultas a 10 por
 * minuto: un `429` muestra «Demasiados intentos, espera un minuto». No sondea.
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
    PaymentStatusBadge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Pagos"
        description="Todos los pagos de la plataforma, en solo lectura."
      />

      <app-admin-filters
        ariaLabel="Filtros de pagos"
        [fields]="fields"
        [values]="values()"
        (valuesChange)="applyFilters($event)"
      />

      @if (payments.hasValue()) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        emptyIcon="receipt"
        [loading]="payments.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="payments.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="createdAt" let-row>
            {{ date(payment(row).createdAt) }}
          </ng-template>
          <ng-template appTableCell="metodo" let-row>
            {{ method(payment(row)) }}
          </ng-template>
          <ng-template appTableCell="monto" let-row>
            <span class="font-semibold">{{ cop(payment(row).monto) }}</span>
          </ng-template>
          <ng-template appTableCell="status" let-row>
            <app-payment-status-badge [status]="payment(row).status" />
          </ng-template>
          <ng-template appTableCell="buyerId" let-row>
            <a
              class="font-mono text-sm"
              [routerLink]="['/admin/usuarios', payment(row).buyerId]"
              [attr.aria-label]="'Ver al comprador ' + payment(row).buyerId"
              >{{ short(payment(row).buyerId) }}</a
            >
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/admin/pagos', payment(row).id]"
              [ariaLabel]="'Ver el pago del ' + date(payment(row).createdAt)"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1 || hasFilters()) {
          <a emptyActions app-button variant="secondary" routerLink="/admin/pagos">
            {{ filter().page > 1 ? 'Ir a la primera página' : 'Quitar los filtros' }}
          </a>
        }
      </app-resource-state>

      <app-pagination
        ariaLabel="Paginación de pagos"
        [page]="filter().page"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class Pagos {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parsePaymentsFilter(this.queryParams()));
  protected readonly values = computed<Record<string, string>>(() => {
    const { status, buyerId, orderId } = this.filter();
    const values: Record<string, string> = {};
    if (status) {
      values['status'] = status;
    }
    if (buyerId) {
      values['buyerId'] = buyerId;
    }
    if (orderId) {
      values['orderId'] = orderId;
    }
    return values;
  });
  protected readonly hasFilters = computed(() => Object.keys(this.values()).length > 0);

  protected readonly payments = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listPayments(params),
  });

  protected readonly error = computed(() => paymentsError(resourceApiError(this.payments.error())));
  protected readonly items = computed(() =>
    this.payments.hasValue() ? this.payments.value().data : [],
  );
  protected readonly totalPages = computed(() =>
    this.payments.hasValue() ? this.payments.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.payments.hasValue() ? this.payments.value().total : 0;
    return total === 1 ? '1 pago' : `${total} pagos`;
  });
  protected readonly emptyView = computed(() => {
    if (this.filter().page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay pagos en esta página. Vuelve a la primera.',
      };
    }
    return this.hasFilters()
      ? {
          title: 'No hay pagos con estos filtros',
          description: 'Prueba con otro estado, comprador o pedido, o quita los filtros.',
        }
      : { title: 'Aún no hay pagos', description: 'Los pagos aparecerán aquí.' };
  });

  protected readonly fields = FIELDS;
  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;
  protected readonly short = shortId;
  protected readonly columns: TableColumn<AdminPayment>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'metodo', header: 'Método' },
    { field: 'monto', header: 'Monto' },
    { field: 'status', header: 'Estado' },
    { field: 'buyerId', header: 'Comprador' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected payment(row: unknown): AdminPayment {
    return row as AdminPayment;
  }

  protected method(payment: AdminPayment): string {
    return paymentMethodLabel(payment.metodo);
  }

  /** Cambiar un filtro reinicia la página. */
  protected applyFilters(values: Record<string, string>): void {
    this.navigate({ ...parsePaymentsFilter({ get: (name) => values[name] ?? null }), page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  private navigate(filter: AdminPaymentsFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterQuery(filter) });
  }
}
