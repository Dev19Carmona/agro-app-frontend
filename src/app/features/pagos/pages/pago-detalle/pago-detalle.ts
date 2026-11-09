import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { resourceApiError } from '../../../../core/http';
import { OrdersApi, remainingMs } from '../../../../core/orders';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PaymentSummary } from '../../components/payment-summary/payment-summary';
import { Payment, isPaymentSettled } from '../../../../core/payments';
import { PagosApi } from '../../services/pagos-api';
import { isObjectId } from '../../utils/filter-params';
import { startPaymentPolling } from '../../utils/payment-polling';

/**
 * `/pagos/:id`: datos del pago (estado, monto, método, referencia, motivo y fecha), enlace a su
 * pedido y, si fue `DECLINED` o `ERROR` y el pedido sigue pagable, **Reintentar pago**.
 *
 * Un pago `PROCESSING` o `PENDING` se vuelve a consultar cada 8 s (2 minutos como máximo, con
 * retroceso ante un `429`); después se ofrece **Actualizar**. Un pago ajeno, inexistente o con id
 * inválido muestra «Pago no encontrado».
 */
@Component({
  imports: [PageHeader, ResourceState, Card, Alert, Button, EmptyState, RouterLink, PaymentSummary],
  template: `
    <div class="space-y-6">
      <app-page-header title="Detalle de pago" description="Datos del pago y su estado.">
        <a actions app-button variant="secondary" routerLink="/pagos">Volver a mis pagos</a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Pago no encontrado"
          description="El pago no existe o no es tuyo."
          icon="receipt"
        >
          <a actions app-button routerLink="/pagos">Ver mis pagos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="resource.isLoading() && !payment()"
          [error]="error()"
          (retry)="resource.reload()"
        >
          @if (payment(); as p) {
            <div class="space-y-4">
              @if (!settled()) {
                <app-alert variant="info" title="Pago en proceso">
                  @if (pollStopped()) {
                    <p>
                      Todavía no recibimos la confirmación de la pasarela. El pago queda pendiente
                      de confirmación.
                    </p>
                    <div class="pt-2">
                      <button app-button size="sm" (click)="refresh()">Actualizar</button>
                    </div>
                  } @else {
                    <p>Consultando el estado del pago cada pocos segundos…</p>
                  }
                </app-alert>
              }

              <app-card class="space-y-4">
                <app-payment-summary [payment]="p" />
                <div class="flex flex-wrap gap-2">
                  <a app-button variant="secondary" [routerLink]="['/pedidos', p.orderId]">
                    Ver pedido
                  </a>
                  @if (canRetry()) {
                    <a app-button [routerLink]="['/pedidos', p.orderId, 'pago']">
                      Reintentar pago
                    </a>
                  }
                </div>
              </app-card>
            </div>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class PagoDetalle {
  private readonly pagos = inject(PagosApi);
  private readonly orders = inject(OrdersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Con un id inválido no se pide nada. */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));

  protected readonly resource = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.pagos.getPayment(params),
  });

  /** El pago mostrado: el de la carga, o el último que trajo el sondeo. */
  protected readonly payment = linkedSignal<Payment | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = computed(() => (this.payment() ? null : this.apiError()));

  protected readonly settled = computed(() => {
    const payment = this.payment();
    return !payment || isPaymentSettled(payment.status);
  });
  /** Solo cambia al cambiar de pago o de estado, no con cada respuesta del sondeo. */
  private readonly pollingId = computed(() => {
    const payment = this.payment();
    return payment && !isPaymentSettled(payment.status) ? payment.id : null;
  });
  protected readonly pollStopped = signal(false);
  private readonly pollEpoch = signal(0);
  private refreshing = false;

  /** El pedido de un pago fallido, para saber si aún se puede reintentar. */
  private readonly failedOrderId = computed(() => {
    const status = this.payment()?.status;
    return status === 'DECLINED' || status === 'ERROR' ? this.payment()?.orderId : undefined;
  });
  private readonly orderResource = rxResource({
    params: () => this.failedOrderId(),
    stream: ({ params }) => this.orders.getOrder(params),
  });

  protected readonly canRetry = computed(() => {
    const order = this.orderResource.hasValue() ? this.orderResource.value() : undefined;
    return (
      order?.status === 'AWAITING_PAYMENT' &&
      !!order.expiresAt &&
      remainingMs(order.expiresAt, Date.now()) > 0
    );
  });

  constructor() {
    // Sondeo de un pago en proceso; `onCleanup` lo detiene al cambiar de estado o al salir.
    effect((onCleanup) => {
      const id = this.pollingId();
      this.pollEpoch();
      if (!id) {
        return;
      }
      untracked(() => this.pollStopped.set(false));
      onCleanup(
        startPaymentPolling(
          this.pagos,
          id,
          (payment) => this.payment.set(payment),
          () => this.pollStopped.set(true),
        ),
      );
    });
  }

  /** Consulta ahora el pago y reinicia el sondeo si sigue en proceso. */
  protected refresh(): void {
    const id = this.validId();
    if (!id || this.refreshing) {
      return;
    }
    this.refreshing = true;
    this.pagos
      .getPayment(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.refreshing = false;
          this.pollEpoch.update((n) => n + 1);
        }),
      )
      .subscribe({ next: (payment) => this.payment.set(payment), error: () => undefined });
  }
}
