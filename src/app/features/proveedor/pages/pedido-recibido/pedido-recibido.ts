import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { SubOrderItems } from '../../components/sub-order-items/sub-order-items';
import { ProveedorApi } from '../../services/proveedor-api';
import { formatDateTime } from '../../utils/format-date';
import { isObjectId } from '../../utils/product-validation';

/**
 * `/proveedor/pedidos/:id`: un sub-pedido pagado de la tienda con sus ítems, su estado y el
 * identificador del pedido. Un id ajeno, inexistente o con formato inválido muestra «Pedido no
 * encontrado». No muestra al comprador ni el total del pedido.
 */
@Component({
  imports: [PageHeader, ResourceState, Card, Badge, Button, EmptyState, RouterLink, SubOrderItems],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Detalle del pedido"
        [description]="order.hasValue() ? date(order.value().createdAt) : null"
      >
        <a actions app-button variant="secondary" routerLink="/proveedor/pedidos"
          >Volver a los pedidos</a
        >
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Pedido no encontrado"
          description="El pedido no existe o no incluye productos de tu tienda."
          icon="receipt"
        >
          <a actions app-button routerLink="/proveedor/pedidos">Ver los pedidos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="order.isLoading()"
          [error]="error()"
          (retry)="order.reload()"
        >
          @if (order.hasValue()) {
            <app-card padding="lg" class="space-y-6">
              <dl class="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt class="text-sm text-fg-muted">Estado</dt>
                  <dd><app-badge tone="success">Pagado</app-badge></dd>
                </div>
                <div>
                  <dt class="text-sm text-fg-muted">Pedido</dt>
                  <dd class="font-mono text-sm wrap-break-word">{{ order.value().orderId }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-fg-muted">Subtotal de tu tienda</dt>
                  <dd class="text-xl font-semibold">{{ cop(order.value().subtotal) }}</dd>
                </div>
              </dl>
              <section aria-labelledby="items-titulo" class="space-y-3">
                <h2 id="items-titulo" class="text-2xl">Ítems</h2>
                <app-sub-order-items [items]="order.value().items" />
              </section>
            </app-card>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class PedidoRecibido {
  private readonly api = inject(ProveedorApi);
  private readonly route = inject(ActivatedRoute);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');

  /** Con un id inválido no se pide nada. */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));
  protected readonly order = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.api.getSubOrder(params),
  });

  private readonly apiError = computed(() => resourceApiError(this.order.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = computed(() => this.apiError());

  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;
}
