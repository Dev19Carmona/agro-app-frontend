import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import {
  PAYMENT_STATUSES,
  Payment,
  PaymentStatusBadge,
  isPaymentStatus,
  paymentMethodLabel,
  paymentStatusLabel,
} from '../../../../core/payments';
import { PaymentsFilter } from '../../models/pagos.types';
import { PagosApi } from '../../services/pagos-api';
import { isObjectId, parsePaymentsFilter, paymentsFilterQuery } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format-date';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  ...PAYMENT_STATUSES.map((status) => ({ value: status, label: paymentStatusLabel(status) })),
];

const ORDER_ID_ERROR = 'El id del pedido son 24 caracteres entre 0-9 y a-f';

/**
 * `/pagos`: historial de pagos propios (el más reciente primero), paginado, con filtros por estado
 * y por pedido. `?status=`, `?orderId=` y `?page=` viven en la URL y sobreviven a recargar; los
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
    Select,
    Input,
    PaymentStatusBadge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Mis pagos" description="Historial de tus pagos y su estado.">
        <a actions app-button variant="secondary" routerLink="/pedidos">Ver mis pedidos</a>
      </app-page-header>

      <form
        class="flex flex-wrap items-start gap-3"
        aria-label="Filtros de pagos"
        (submit)="applyOrderId($event)"
      >
        <div class="w-full sm:w-56">
          <app-select
            label="Estado"
            [options]="statusOptions"
            [value]="filter().status ?? ''"
            (valueChange)="setStatus($event)"
          />
        </div>
        <div class="w-full sm:w-80">
          <app-input
            label="Id del pedido"
            autocomplete="off"
            [value]="orderDraft()"
            [errors]="orderIdErrors()"
            [touched]="orderIdInvalid()"
            (valueChange)="orderDraft.set(asText($event))"
          />
        </div>
        <button app-button type="submit" variant="secondary" class="mt-1">Filtrar</button>
        @if (filter().orderId) {
          <button app-button type="button" variant="ghost" class="mt-1" (click)="clearOrderId()">
            Quitar pedido
          </button>
        }
      </form>

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
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/pagos', payment(row).id]"
              [ariaLabel]="'Ver el pago del ' + date(payment(row).createdAt)"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1 || filter().status || filter().orderId) {
          <a emptyActions app-button variant="secondary" routerLink="/pagos">
            {{ filter().page > 1 ? 'Ir a la primera página' : 'Quitar los filtros' }}
          </a>
        } @else {
          <a emptyActions app-button routerLink="/pedidos">Ver mis pedidos</a>
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
export class MisPagos {
  private readonly api = inject(PagosApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parsePaymentsFilter(this.queryParams()));

  /** Texto del campo del pedido: sigue a la URL y lo escrito se aplica con **Filtrar**. */
  protected readonly orderDraft = linkedSignal(() => this.filter().orderId ?? '');
  protected readonly orderIdInvalid = computed(() => {
    const draft = this.orderDraft().trim();
    return this.submittedInvalid() && draft !== '' && !isObjectId(draft);
  });
  protected readonly orderIdErrors = computed(() =>
    this.orderIdInvalid() ? [{ kind: 'orderId', message: ORDER_ID_ERROR }] : [],
  );
  private readonly submittedInvalid = linkedSignal<string, boolean>({
    source: () => this.orderDraft(),
    computation: () => false,
  });

  protected readonly payments = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listPayments(params),
  });

  protected readonly error = computed(() => resourceApiError(this.payments.error()));
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
    const { page, status, orderId } = this.filter();
    if (page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay pagos en esta página. Vuelve a la primera.',
      };
    }
    return status || orderId
      ? {
          title: 'No hay pagos con estos filtros',
          description: 'Prueba con otro estado u otro pedido, o quita los filtros.',
        }
      : {
          title: 'Aún no tienes pagos',
          description: 'Cuando pagues un pedido, el pago aparecerá aquí.',
        };
  });

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;

  protected readonly columns: TableColumn<Payment>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'metodo', header: 'Método' },
    { field: 'monto', header: 'Monto' },
    { field: 'status', header: 'Estado' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected payment(row: unknown): Payment {
    return row as Payment;
  }

  protected method(payment: Payment): string {
    return paymentMethodLabel(payment.metodo);
  }

  protected asText(value: string | number | null): string {
    return value === null ? '' : String(value);
  }

  /** Cambiar el filtro reinicia la página. */
  protected setStatus(value: string): void {
    const status = isPaymentStatus(value) ? value : undefined;
    if (status === this.filter().status) {
      return;
    }
    this.navigate({ page: 1, ...this.keep({ status }) });
  }

  /** Aplica el id del pedido escrito; uno inválido no navega y muestra el error. */
  protected applyOrderId(event: Event): void {
    event.preventDefault();
    const draft = this.orderDraft().trim();
    if (draft !== '' && !isObjectId(draft)) {
      this.submittedInvalid.set(true);
      return;
    }
    const orderId = draft === '' ? undefined : draft;
    if (orderId === this.filter().orderId) {
      return;
    }
    this.navigate({ page: 1, ...this.keep({ orderId }) });
  }

  protected clearOrderId(): void {
    this.navigate({ page: 1, ...this.keep({ orderId: undefined }) });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  /** El filtro actual con `change` aplicado (sin `page`). */
  private keep(change: Partial<Pick<PaymentsFilter, 'status' | 'orderId'>>) {
    const { status, orderId } = { ...this.filter(), ...change };
    return { ...(status ? { status } : {}), ...(orderId ? { orderId } : {}) };
  }

  private navigate(filter: PaymentsFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: paymentsFilterQuery(filter),
    });
  }
}
