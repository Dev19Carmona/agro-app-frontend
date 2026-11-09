import { NgTemplateOutlet } from '@angular/common';
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
import { Subscription, finalize, forkJoin, map } from 'rxjs';
import { formatCop } from '../../../../core/catalog';
import { ApiError, resourceApiError } from '../../../../core/http';
import {
  Order,
  OrderCountdown,
  OrderStatusBadge,
  OrdersApi,
  cancellationMessage,
  remainingMs,
} from '../../../../core/orders';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PaymentForm, PaymentFormValue } from '../../components/payment-form/payment-form';
import { PaymentResult } from '../../components/payment-result/payment-result';
import { PaymentSummary } from '../../components/payment-summary/payment-summary';
import {
  ORDER_CONFIRM_POLL_INTERVAL_MS,
  ORDER_CONFIRM_POLL_MAX_MS,
} from '../../models/pagos.types';
import { Payment, blocksNewPayment, isPaymentSettled } from '../../../../core/payments';
import { PagosApi } from '../../services/pagos-api';
import { isObjectId } from '../../utils/filter-params';
import { PaymentErrorAction, toPaymentErrorAction } from '../../utils/payment-error';
import { withinPollWindow } from '../../utils/poll';
import { startPaymentPolling } from '../../utils/payment-polling';

interface Unavailable {
  title: string;
  description: string;
}

/**
 * `/pedidos/:id/pago`: monto, estado y cronómetro del pedido y, si es pagable, el formulario del
 * simulador. Al abrirse consulta el último pago del pedido: uno `PROCESSING`, `PENDING` o
 * `APPROVED` se muestra en lugar del formulario.
 *
 * - **Idempotency-Key:** `crypto.randomUUID()` en memoria. Se reutiliza solo si el intento anterior
 *   falló sin respuesta (`status 0`) o con `429` y el método y el token no cambiaron; en cualquier
 *   otro caso (rechazo, error, `422`, cambio de método o token) se genera una nueva.
 * - **Pago `PROCESSING`:** consulta `GET /payments/:id` cada 8 s (el doble ante un `429`, hasta
 *   30 s) durante 2 minutos como máximo; después ofrece **Actualizar**.
 * - **Pago `APPROVED`:** consulta el pedido cada 2 s, 30 s como máximo, hasta que esté `CONFIRMED`.
 * - Un fallo durante un sondeo no borra lo ya mostrado. Los sondeos se detienen al salir.
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Alert,
    Button,
    EmptyState,
    RouterLink,
    OrderStatusBadge,
    OrderCountdown,
    PaymentForm,
    PaymentResult,
    PaymentSummary,
    NgTemplateOutlet,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Pagar pedido"
        description="Paga con la pasarela de prueba y sigue el resultado aquí."
      >
        @if (validId()) {
          <a actions app-button variant="secondary" [routerLink]="['/pedidos', id()]">
            Volver al pedido
          </a>
        }
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Pedido no encontrado"
          description="El pedido no existe o no es tuyo."
          icon="receipt"
        >
          <a actions app-button routerLink="/pedidos">Ver mis pedidos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="loaded.isLoading() && !order()"
          [error]="error()"
          (retry)="loaded.reload()"
        >
          @if (order(); as o) {
            <div class="space-y-6">
              <app-card class="space-y-4">
                <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
                  <dt class="text-fg-muted">Monto a pagar</dt>
                  <dd class="text-2xl font-semibold">{{ cop(o.total) }}</dd>
                  <dt class="text-fg-muted">Estado del pedido</dt>
                  <dd><app-order-status-badge [status]="o.status" /></dd>
                </dl>
                @if (o.status === 'AWAITING_PAYMENT' && o.expiresAt) {
                  <div class="flex flex-col gap-1">
                    <span class="text-fg-muted">Tiempo para pagar</span>
                    <app-order-countdown [expiresAt]="o.expiresAt" (expired)="onExpired()" />
                  </div>
                }
              </app-card>

              @for (p of results(); track p.id) {
                <app-payment-result [payment]="p">
                  @switch (p.status) {
                    @case ('APPROVED') {
                      @if (o.status === 'CONFIRMED') {
                        <p>Tu pedido quedó confirmado.</p>
                        <div class="flex flex-wrap gap-2 pt-2">
                          <a app-button size="sm" [routerLink]="['/pedidos', o.id]">Ver pedido</a>
                          <a app-button size="sm" variant="secondary" routerLink="/pagos">
                            Ver mis pagos
                          </a>
                        </div>
                      } @else if (confirmTimedOut()) {
                        <p>El pago se aprobó, pero el pedido aún no aparece confirmado.</p>
                        <div class="pt-2">
                          <button app-button size="sm" (click)="refresh()">Actualizar</button>
                        </div>
                      } @else {
                        <p>Confirmando tu pedido…</p>
                      }
                    }
                    @case ('PROCESSING') {
                      <ng-container *ngTemplateOutlet="waiting" />
                    }
                    @case ('PENDING') {
                      <ng-container *ngTemplateOutlet="waiting" />
                    }
                  }
                </app-payment-result>
              }

              @if (payable()) {
                <app-card class="space-y-4">
                  <h2 class="text-2xl">Método de pago</h2>
                  @if (submitError(); as action) {
                    <app-alert [variant]="action.kind === 'in-progress' ? 'info' : 'danger'">
                      <p>{{ action.message }}</p>
                      @if (action.note) {
                        <p class="text-fg-muted">{{ action.note }}</p>
                      }
                    </app-alert>
                  }
                  <app-payment-form [busy]="submitting()" (submitted)="pay($event)" />
                </app-card>
              } @else if (unavailable(); as info) {
                <app-empty-state
                  [title]="info.title"
                  [description]="info.description"
                  icon="receipt"
                >
                  <a actions app-button [routerLink]="['/pedidos', o.id]">Ver el pedido</a>
                </app-empty-state>
              } @else if (payment(); as p) {
                <app-card>
                  <app-payment-summary [payment]="p" />
                </app-card>
              }
            </div>
          }
        </app-resource-state>
      }
    </div>

    <ng-template #waiting>
      @if (pollStopped()) {
        <p>
          Todavía no recibimos la confirmación de la pasarela. El pago queda pendiente de
          confirmación.
        </p>
        <div class="pt-2">
          <button app-button size="sm" (click)="refresh()">Actualizar</button>
        </div>
      } @else {
        <p>Consultando el estado del pago cada pocos segundos…</p>
      }
    </ng-template>
  `,
})
export class PagarPedido {
  private readonly orders = inject(OrdersApi);
  private readonly pagos = inject(PagosApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Con un id inválido no se pide nada. */
  protected readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));

  /** Pedido y último pago del pedido. */
  protected readonly loaded = rxResource({
    params: () => this.validId(),
    stream: ({ params }) =>
      forkJoin({
        order: this.orders.getOrder(params),
        payment: this.pagos
          .listPayments({ page: 1, orderId: params }, 1)
          .pipe(map((page) => page.data[0] ?? null)),
      }),
  });

  /** El pedido mostrado: el de la carga, o el último que trajo un sondeo. */
  protected readonly order = linkedSignal<Order | undefined>(() =>
    this.loaded.hasValue() ? this.loaded.value().order : undefined,
  );
  /** El último pago: el de la carga, el del envío o el último que trajo un sondeo. */
  protected readonly payment = linkedSignal<Payment | null>(() =>
    this.loaded.hasValue() ? this.loaded.value().payment : null,
  );

  private readonly apiError = computed(() => resourceApiError(this.loaded.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = computed(() => (this.order() ? null : this.apiError()));

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<PaymentErrorAction | null>(null);
  /** El cronómetro llegó a 0 o el backend dijo `ORDER_NOT_PAYABLE`: manda el backend. */
  private readonly expired = signal(false);
  private readonly forcedNotPayable = signal(false);

  /** El sondeo del pago `PROCESSING` agotó sus 2 minutos. */
  protected readonly pollStopped = signal(false);
  /** El sondeo del pedido tras un pago aprobado agotó sus 30 segundos. */
  protected readonly confirmTimedOut = signal(false);
  /** Se incrementa con **Actualizar** para reiniciar los sondeos. */
  private readonly pollEpoch = signal(0);

  protected readonly cop = formatCop;

  protected readonly results = computed(() => {
    const payment = this.payment();
    return payment ? [payment] : [];
  });

  /** Pedido `AWAITING_PAYMENT` vigente y sin un pago que lo bloquee. */
  protected readonly payable = computed(() => {
    const order = this.order();
    if (!order || this.forcedNotPayable() || this.expired()) {
      return false;
    }
    if (
      order.status !== 'AWAITING_PAYMENT' ||
      !order.expiresAt ||
      remainingMs(order.expiresAt, Date.now()) <= 0
    ) {
      return false;
    }
    const payment = this.payment();
    return !(payment && blocksNewPayment(payment.status));
  });

  /** Por qué no se puede pagar; `null` si hay un pago en curso o aprobado que ya lo explica. */
  protected readonly unavailable = computed<Unavailable | null>(() => {
    const order = this.order();
    const payment = this.payment();
    if (!order || this.payable() || (payment && blocksNewPayment(payment.status))) {
      return null;
    }
    if (this.forcedNotPayable()) {
      return {
        title: 'El pedido ya no admite pago',
        description: 'Revisa su estado en el pedido.',
      };
    }
    switch (order.status) {
      case 'PENDING':
        return {
          title: 'El pedido aún se está preparando',
          description: 'Estamos reservando el stock. Podrás pagar cuando esté listo.',
        };
      case 'CONFIRMED':
        return { title: 'Este pedido ya está confirmado', description: 'No necesita otro pago.' };
      case 'CANCELLED':
        return {
          title: 'Este pedido está cancelado',
          description: cancellationMessage(order) ?? 'Ya no admite pago.',
        };
      default:
        return {
          title: 'El tiempo para pagar venció',
          description: 'El pedido se cancelará y el stock se liberará.',
        };
    }
  });

  /** Solo cambia al cambiar de pago o de estado, no con cada respuesta del sondeo. */
  private readonly pollingPaymentId = computed(() => {
    const payment = this.payment();
    return payment && !isPaymentSettled(payment.status) ? payment.id : null;
  });
  private readonly confirmingOrder = computed(
    () => this.payment()?.status === 'APPROVED' && this.order()?.status === 'AWAITING_PAYMENT',
  );

  /** Clave del intento en curso, el cuerpo para el que se generó y si se puede reutilizar. */
  private key: string | null = null;
  private keySignature = '';
  private reuseKey = false;
  private refreshing = false;

  constructor() {
    this.pollPayment();
    this.confirmOrder();
  }

  /** Sondeo de un pago `PROCESSING`/`PENDING`. `onCleanup` lo detiene al cambiar de estado o salir. */
  private pollPayment(): void {
    effect((onCleanup) => {
      const id = this.pollingPaymentId();
      this.pollEpoch();
      if (!id) {
        return;
      }
      untracked(() => this.pollStopped.set(false));
      const stop = startPaymentPolling(
        this.pagos,
        id,
        (payment) => this.payment.set(payment),
        () => this.pollStopped.set(true),
      );
      onCleanup(stop);
    });
  }

  /** Tras un pago aprobado, consulta el pedido hasta que esté `CONFIRMED` (30 s como máximo). */
  private confirmOrder(): void {
    effect((onCleanup) => {
      const confirming = this.confirmingOrder();
      this.pollEpoch();
      const id = untracked(() => this.order()?.id);
      if (!confirming || !id) {
        return;
      }
      untracked(() => this.confirmTimedOut.set(false));
      const started = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let request: Subscription | undefined;

      const next = () => {
        if (!withinPollWindow(Date.now() - started, ORDER_CONFIRM_POLL_MAX_MS)) {
          this.confirmTimedOut.set(true);
          return;
        }
        timer = setTimeout(tick, ORDER_CONFIRM_POLL_INTERVAL_MS);
      };
      const tick = () => {
        request = this.orders.getOrder(id).subscribe({
          next: (order) => {
            this.order.set(order);
            if (order.status === 'AWAITING_PAYMENT') {
              next();
            }
          },
          error: () => next(),
        });
      };
      timer = setTimeout(tick, ORDER_CONFIRM_POLL_INTERVAL_MS);
      onCleanup(() => {
        clearTimeout(timer);
        request?.unsubscribe();
      });
    });
  }

  protected pay(value: PaymentFormValue): void {
    const order = this.order();
    if (!order || this.submitting() || !this.payable()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);

    // La misma clave solo si el intento anterior no obtuvo respuesta y el cuerpo no cambió.
    const signature = `${value.metodo}|${value.token}`;
    if (!(this.reuseKey && this.key && signature === this.keySignature)) {
      this.key = crypto.randomUUID();
    }
    this.keySignature = signature;
    this.reuseKey = false;

    this.pagos
      .createPayment({ orderId: order.id, ...value }, this.key)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (payment) => this.payment.set(payment),
        error: (error: ApiError) => this.onPayError(error),
      });
  }

  private onPayError(error: ApiError): void {
    const action = toPaymentErrorAction(error);
    this.reuseKey = action.reuseKey;
    this.submitError.set(action);
    if (action.kind === 'not-payable') {
      this.forcedNotPayable.set(true);
    }
    if (
      action.kind === 'not-payable' ||
      action.kind === 'in-progress' ||
      action.kind === 'not-found'
    ) {
      this.loaded.reload();
    }
  }

  /** El cronómetro llegó a 0: se vuelve a consultar y manda lo que diga el backend. */
  protected onExpired(): void {
    this.expired.set(true);
    this.loaded.reload();
  }

  /** Consulta ahora el pago y el pedido y reinicia los sondeos que se habían detenido. */
  protected refresh(): void {
    const payment = this.payment();
    const order = this.order();
    if (this.refreshing || !payment || !order) {
      return;
    }
    this.refreshing = true;
    forkJoin({
      payment: this.pagos.getPayment(payment.id),
      order: this.orders.getOrder(order.id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.refreshing = false;
          this.pollEpoch.update((n) => n + 1);
        }),
      )
      .subscribe({
        next: (result) => {
          this.payment.set(result.payment);
          this.order.set(result.order);
        },
        error: () => undefined,
      });
  }
}
