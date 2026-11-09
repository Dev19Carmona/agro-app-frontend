import { Component, DestroyRef, computed, effect, inject, linkedSignal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi, formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import {
  Order,
  OrderCountdown,
  OrderStatusBadge,
  OrdersApi,
  cancellationMessage,
} from '../../../../core/orders';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderSubOrders } from '../../../../core/orders';
import { ORDER_POLL_INTERVAL_MS } from '../../models/pedidos.types';
import { formatDateTime } from '../../utils/format-date';
import { isObjectId } from '../../utils/object-id';
import { loadStoreNames } from '../../utils/store-names';

/**
 * `/pedidos/:id`: estado del pedido, ítems por tienda con su snapshot y total.
 *
 * - `PENDING`: vuelve a consultar `GET /orders/:id` cada `ORDER_POLL_INTERVAL_MS`. El sondeo se
 *   detiene al cambiar de estado o al salir de la pantalla, y un fallo durante el sondeo no borra
 *   lo ya mostrado (se reintenta en el siguiente ciclo).
 * - `AWAITING_PAYMENT`: cronómetro hasta `expiresAt` y botón **Pagar** hacia `/pedidos/:id/pago`.
 *   Al llegar el cronómetro a 0 se vuelve a consultar y manda lo que diga el backend.
 * - `CONFIRMED` y `CANCELLED`: estado final; si está cancelado, el motivo inferido.
 *
 * Un pedido ajeno, inexistente o con id inválido muestra «Pedido no encontrado».
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
    OrderSubOrders,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Detalle de pedido"
        [description]="order() ? date(order()!.createdAt) : null"
      >
        <a actions app-button variant="secondary" routerLink="/pedidos">Volver a mis pedidos</a>
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
          [loading]="resource.isLoading() && !order()"
          [error]="order() ? null : error()"
          (retry)="resource.reload()"
        >
          @if (order(); as o) {
            <div class="space-y-6">
              <app-card padding="lg" class="space-y-6">
                <dl class="grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt class="text-sm text-fg-muted">Estado</dt>
                    <dd><app-order-status-badge [status]="o.status" /></dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Pedido</dt>
                    <dd class="font-mono text-sm wrap-break-word">{{ o.id }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Total</dt>
                    <dd class="text-xl font-semibold">{{ cop(o.total) }}</dd>
                  </div>
                </dl>

                @switch (o.status) {
                  @case ('PENDING') {
                    <app-alert variant="info">
                      Estamos reservando el stock de tu pedido. Esta pantalla se actualiza sola.
                    </app-alert>
                  }
                  @case ('AWAITING_PAYMENT') {
                    <section aria-labelledby="pago-titulo" class="space-y-3">
                      <h2 id="pago-titulo" class="text-2xl">Pago pendiente</h2>
                      <p class="text-fg-muted">
                        Tienes 15 minutos para pagar; después el pedido se cancela y el stock se
                        libera.
                      </p>
                      @if (o.expiresAt) {
                        <div class="flex flex-wrap items-center gap-4">
                          <app-order-countdown [expiresAt]="o.expiresAt" (expired)="refresh()" />
                        </div>
                      }
                      <div class="flex flex-wrap gap-2">
                        <a app-button [routerLink]="['/pedidos', o.id, 'pago']">Pagar</a>
                        <button app-button variant="secondary" (click)="refresh()">
                          Actualizar estado
                        </button>
                      </div>
                    </section>
                  }
                  @case ('CONFIRMED') {
                    <app-alert variant="success">
                      Pedido confirmado: el pago fue aprobado.
                    </app-alert>
                  }
                  @case ('CANCELLED') {
                    <app-alert variant="danger">{{ cancelMessage() }}</app-alert>
                  }
                }
              </app-card>

              <section aria-labelledby="items-titulo" class="space-y-3">
                <h2 id="items-titulo" class="text-2xl">Ítems</h2>
                <app-order-sub-orders [subOrders]="o.subOrders" [storeNames]="storeNames()" />
              </section>
            </div>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class PedidoDetalle {
  private readonly api = inject(OrdersApi);
  private readonly catalog = inject(CatalogApi);
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
    stream: ({ params }) => this.api.getOrder(params),
  });

  /** El pedido mostrado: el de la carga inicial, o el último que trajo el sondeo. */
  protected readonly order = linkedSignal<Order | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = this.apiError;

  /** Solo cambia cuando cambia el estado, no con cada respuesta del sondeo. */
  private readonly status = computed(() => this.order()?.status);

  protected readonly cancelMessage = computed(() => {
    const order = this.order();
    return order ? cancellationMessage(order) : null;
  });

  private readonly storeIds = computed(() =>
    [...new Set((this.order()?.subOrders ?? []).map((sub) => sub.storeId))].sort().join(','),
  );
  private readonly stores = rxResource({
    params: () => this.storeIds() || undefined,
    stream: ({ params }) => loadStoreNames(this.catalog, params.split(',')),
  });
  protected readonly storeNames = computed<ReadonlyMap<string, string>>(() =>
    this.stores.hasValue() ? this.stores.value() : new Map(),
  );

  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;

  private inFlight = false;

  constructor() {
    // Sondeo: solo mientras el pedido está `PENDING`. Al cambiar de estado o destruir la pantalla,
    // `onCleanup` detiene el temporizador.
    effect((onCleanup) => {
      if (this.status() !== 'PENDING') {
        return;
      }
      const timer = setInterval(() => this.refresh(), ORDER_POLL_INTERVAL_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  /**
   * Vuelve a pedir el pedido sin mostrar el esqueleto. Un fallo no borra lo ya mostrado. No hace
   * nada si ya hay una consulta en curso.
   */
  protected refresh(): void {
    const id = this.validId();
    if (!id || this.inFlight) {
      return;
    }
    this.inFlight = true;
    this.api
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.inFlight = false;
          this.order.set(order);
        },
        error: () => {
          this.inFlight = false;
        },
      });
  }
}
