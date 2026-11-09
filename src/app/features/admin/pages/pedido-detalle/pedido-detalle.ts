import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { OrderStatusBadge, OrderSubOrders } from '../../../../core/orders';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { AdminApi } from '../../services/admin-api';
import { isObjectId } from '../../utils/filter-params';
import { formatDateTime, shortId } from '../../utils/format';

/**
 * `/admin/pedidos/:id`: pedido completo en solo lectura (sin ninguna acción), con comprador, fecha,
 * total y los sub-pedidos por tienda con sus ítems tal como se compraron. El nombre de cada tienda
 * se consulta una sola vez por `storeId` distinto, en paralelo; si falla, esa tienda muestra su id
 * abreviado. Un id inválido o inexistente muestra «Pedido no encontrado».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Button,
    EmptyState,
    RouterLink,
    OrderStatusBadge,
    OrderSubOrders,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Detalle de pedido" description="Pedido completo, en solo lectura.">
        <a actions app-button variant="secondary" routerLink="/admin/pedidos"> Volver a pedidos </a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Pedido no encontrado"
          description="El pedido no existe o el enlace no es válido."
          icon="receipt"
        >
          <a actions app-button routerLink="/admin/pedidos">Ver pedidos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="resource.isLoading()"
          [error]="error()"
          (retry)="resource.reload()"
        >
          @if (order(); as o) {
            <div class="space-y-6">
              <app-card padding="lg" class="space-y-6">
                <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt class="text-sm text-fg-muted">Estado</dt>
                    <dd><app-order-status-badge [status]="o.status" /></dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Total</dt>
                    <dd class="text-xl font-semibold">{{ cop(o.total) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Fecha</dt>
                    <dd>{{ date(o.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Comprador</dt>
                    <dd>
                      <a
                        class="font-mono text-sm"
                        [routerLink]="['/admin/usuarios', o.buyerId]"
                        [attr.aria-label]="'Ver al comprador ' + o.buyerId"
                        >{{ short(o.buyerId) }}</a
                      >
                    </dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-4">
                    <dt class="text-sm text-fg-muted">Pedido</dt>
                    <dd class="font-mono text-sm wrap-break-word">{{ o.id }}</dd>
                  </div>
                </dl>
                <div class="flex flex-wrap gap-2">
                  <a
                    app-button
                    variant="secondary"
                    routerLink="/admin/pagos"
                    [queryParams]="{ orderId: o.id }"
                  >
                    Ver pagos del pedido
                  </a>
                </div>
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
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);

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

  protected readonly order = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = this.apiError;

  /** `storeId` distintos del pedido, en orden estable, como una sola clave de recurso. */
  private readonly storeIds = computed(() =>
    [...new Set((this.order()?.subOrders ?? []).map((sub) => sub.storeId))].sort().join(','),
  );
  private readonly stores = rxResource({
    params: () => this.storeIds() || undefined,
    stream: ({ params }) => this.loadStoreNames(params.split(',')),
  });
  protected readonly storeNames = computed<ReadonlyMap<string, string>>(() =>
    this.stores.hasValue() ? this.stores.value() : new Map(),
  );

  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;
  protected readonly short = shortId;

  /** Un `GET` por tienda, en paralelo; una que falla se rotula con su id abreviado. */
  private loadStoreNames(ids: string[]): Observable<Map<string, string>> {
    return forkJoin(
      ids.map((id) =>
        this.api.getStore(id).pipe(
          map((store): [string, string] => [id, store.nombre]),
          catchError(() => of<[string, string]>([id, shortId(id)])),
        ),
      ),
    ).pipe(map((entries) => new Map(entries)));
  }
}
