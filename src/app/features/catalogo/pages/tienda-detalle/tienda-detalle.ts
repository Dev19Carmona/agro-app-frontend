import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductCard } from '../../components/product-card/product-card';
import { isObjectId, parsePageParam, toQueryParams } from '../../utils/filter-params';

/**
 * `/catalogo/tiendas/:id`: nombre y municipio de la tienda y sus productos
 * (`GET /catalog/products?storeId=`) con paginación (`?page=`). La tienda y sus productos se piden
 * a la vez; un id inexistente, inactivo o inválido muestra "Tienda no encontrada".
 */
@Component({
  imports: [PageHeader, ResourceState, ProductCard, Pagination, EmptyState, Button, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header
        [title]="store.hasValue() ? store.value().nombre : 'Detalle de tienda'"
        [description]="store.hasValue() ? store.value().municipio : null"
      >
        <a actions app-button variant="secondary" routerLink="/catalogo/tiendas"
          >Volver a las tiendas</a
        >
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Tienda no encontrada"
          description="La tienda no existe o ya no está activa."
          icon="store"
        >
          <a actions app-button routerLink="/catalogo/tiendas">Ver las tiendas</a>
        </app-empty-state>
      } @else {
        <section aria-labelledby="productos-titulo" class="space-y-4">
          <h2 id="productos-titulo" class="text-2xl">Productos de la tienda</h2>

          @if (products.hasValue()) {
            <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
          }

          <app-resource-state
            [loading]="isLoading()"
            [error]="error()"
            [empty]="items().length === 0"
            [emptyTitle]="emptyView().title"
            [emptyDescription]="emptyView().description"
            (retry)="retry()"
          >
            <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (product of items(); track product.id) {
                <li>
                  <app-product-card
                    [product]="product"
                    [categoryName]="categoryNames().get(product.categoryId) ?? null"
                  />
                </li>
              }
            </ul>
            @if (page() > 1) {
              <a emptyActions app-button variant="secondary" [routerLink]="storePath()"
                >Ir a la primera página</a
              >
            }
          </app-resource-state>

          <app-pagination
            ariaLabel="Paginación de productos de la tienda"
            [page]="page()"
            [totalPages]="totalPages()"
            (pageChange)="goToPage($event)"
          />
        </section>
      }
    </div>
  `,
})
export class TiendaDetalle {
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  protected readonly page = computed(() => parsePageParam(this.queryParams()));
  protected readonly storePath = computed(() => `/catalogo/tiendas/${this.id()}`);

  /** Con un id inválido no se pide nada (el backend respondería `400`). */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));
  protected readonly store = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.api.getStore(params),
  });
  protected readonly products = rxResource({
    params: () => {
      const storeId = this.validId();
      return storeId ? { storeId, page: this.page() } : undefined;
    },
    stream: ({ params }) => this.api.listProducts(params),
  });
  /** El nombre de la categoría es un extra: si falla, la tarjeta se muestra sin él. */
  private readonly categories = rxResource({ stream: () => this.api.listCategories() });

  private readonly storeError = computed(() => resourceApiError(this.store.error()));
  private readonly productsError = computed(() => resourceApiError(this.products.error()));
  protected readonly notFound = computed(
    () => !this.validId() || this.storeError()?.status === 404,
  );
  protected readonly error = computed(() => this.storeError() ?? this.productsError());
  protected readonly isLoading = computed(
    () => this.store.isLoading() || this.products.isLoading(),
  );

  protected readonly items = computed(() =>
    this.products.hasValue() ? this.products.value().data : [],
  );
  protected readonly totalPages = computed(() =>
    this.products.hasValue() ? this.products.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.products.hasValue() ? this.products.value().total : 0;
    return total === 1 ? '1 producto' : `${total} productos`;
  });
  protected readonly categoryNames = computed(
    () =>
      new Map(
        (this.categories.hasValue() ? this.categories.value() : []).map((c) => [c.id, c.nombre]),
      ),
  );

  protected readonly emptyView = computed(() =>
    this.page() > 1
      ? {
          title: 'Esta página no existe',
          description: 'No hay productos en esta página. Vuelve a la primera.',
        }
      : {
          title: 'Esta tienda aún no tiene productos',
          description: 'Vuelve más tarde: la tienda todavía no ha publicado productos.',
        },
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams({ page }),
    });
  }

  protected retry(): void {
    if (this.store.error()) {
      this.store.reload();
    }
    if (this.products.error()) {
      this.products.reload();
    }
    if (this.categories.error()) {
      this.categories.reload();
    }
  }
}
