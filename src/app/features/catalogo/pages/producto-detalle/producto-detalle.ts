import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth';
import { CatalogApi } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { VariantsTable } from '../../components/variants-table/variants-table';
import { isObjectId } from '../../utils/filter-params';

/**
 * `/catalogo/productos/:id`: datos del producto, ficha técnica y presentaciones con precio
 * vigente y disponibilidad. El nombre de la tienda sale de otra consulta (`GET /catalog/stores/:id`):
 * si falla, solo se muestra el enlace "Ver tienda".
 *
 * Un producto a cotizar muestra "Precio a cotizar" y no ofrece compra. Para los demás, el visitante
 * ve "Inicia sesión para comprar". El botón de compra llega con la SPEC 07.
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    VariantsTable,
    Card,
    Badge,
    Alert,
    Button,
    EmptyState,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        [title]="product.hasValue() ? product.value().nombre : 'Detalle de producto'"
      >
        <a actions app-button variant="secondary" routerLink="/catalogo">Volver al catálogo</a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Producto no encontrado"
          description="El producto no existe o ya no está disponible."
          icon="search"
        >
          <a actions app-button routerLink="/catalogo">Ver el catálogo</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="product.isLoading()"
          [error]="error()"
          (retry)="retry()"
        >
          @if (product.hasValue()) {
            @let p = product.value();
            <div class="space-y-6">
              <app-card class="space-y-4">
                <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm text-fg-muted">Marca</dt>
                    <dd class="wrap-break-word">{{ p.marca }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Tienda</dt>
                    <dd class="wrap-break-word">
                      <a [routerLink]="['/catalogo/tiendas', p.storeId]">{{
                        store.hasValue() ? store.value().nombre : 'Ver tienda'
                      }}</a>
                      @if (store.hasValue()) {
                        <span class="text-fg-muted"> · {{ store.value().municipio }}</span>
                      }
                    </dd>
                  </div>
                  @if (p.requiresQuote) {
                    <div>
                      <dt class="text-sm text-fg-muted">Venta</dt>
                      <dd><app-badge tone="warning">A cotizar</app-badge></dd>
                    </div>
                  }
                </dl>
              </app-card>

              @if (fichaEntries().length > 0) {
                <section aria-labelledby="ficha-titulo" class="space-y-3">
                  <h2 id="ficha-titulo" class="text-2xl">Ficha técnica</h2>
                  <app-card>
                    <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      @for (entry of fichaEntries(); track entry[0]) {
                        <div>
                          <dt class="text-sm text-fg-muted">{{ entry[0] }}</dt>
                          <dd class="wrap-break-word">{{ entry[1] }}</dd>
                        </div>
                      }
                    </dl>
                  </app-card>
                </section>
              }

              <section aria-labelledby="presentaciones-titulo" class="space-y-3">
                <h2 id="presentaciones-titulo" class="text-2xl">Presentaciones</h2>
                @if (p.variantes.length > 0) {
                  <app-variants-table [variants]="p.variantes" [requiresQuote]="p.requiresQuote" />
                } @else {
                  <p class="text-fg-muted">
                    Este producto aún no tiene presentaciones disponibles.
                  </p>
                }

                @if (p.requiresQuote) {
                  <app-alert variant="info">
                    Este producto se vende por cotización: el precio se acuerda con la tienda y no
                    se compra desde aquí.
                  </app-alert>
                } @else if (!session.isAuthenticated()) {
                  <app-alert variant="info">
                    <span class="flex flex-wrap items-center gap-3">
                      <span>Inicia sesión para comprar.</span>
                      <a
                        app-button
                        size="sm"
                        routerLink="/auth/login"
                        [queryParams]="{ returnUrl: returnUrl() }"
                        >Iniciar sesión</a
                      >
                    </span>
                  </app-alert>
                }
              </section>
            </div>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class ProductoDetalle {
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly session = inject(SessionService);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Ruta del producto, para volver a ella tras iniciar sesión. */
  protected readonly returnUrl = computed(() => `/catalogo/productos/${this.id()}`);

  /** Con un id inválido no se pide nada (el backend respondería `400`). */
  protected readonly product = rxResource({
    params: () => (isObjectId(this.id()) ? this.id() : undefined),
    stream: ({ params }) => this.api.getProduct(params),
  });
  protected readonly store = rxResource({
    params: () => (this.product.hasValue() ? this.product.value().storeId : undefined),
    stream: ({ params }) => this.api.getStore(params),
  });

  private readonly apiError = computed(() => resourceApiError(this.product.error()));
  protected readonly notFound = computed(
    () => !isObjectId(this.id()) || this.apiError()?.status === 404,
  );
  protected readonly error = computed(() => (this.notFound() ? null : this.apiError()));
  protected readonly fichaEntries = computed(() =>
    this.product.hasValue() ? Object.entries(this.product.value().fichaTecnica) : [],
  );

  protected retry(): void {
    this.product.reload();
  }
}
