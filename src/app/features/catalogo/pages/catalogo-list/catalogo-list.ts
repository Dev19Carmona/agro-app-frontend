import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { CatalogoFilters } from '../../components/catalogo-filters/catalogo-filters';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductCard } from '../../components/product-card/product-card';
import { FiltersValue } from '../../models/catalogo.types';
import { parseProductsFilter, toQueryParams } from '../../utils/filter-params';

/**
 * `/catalogo`: productos de todas las tiendas con filtros por categoría y municipio. Los filtros y
 * la página viven en la URL (`?categoryId=…&municipio=…&page=…`): se pueden compartir, Atrás los
 * restaura y recargar los conserva. Cambiar un filtro reinicia la página a 1.
 *
 * El listado no trae precios; el nombre de la categoría y de la tienda se resuelven con dos
 * peticiones aparte cuyo fallo no impide ver los productos.
 */
@Component({
  imports: [
    PageHeader,
    CatalogoFilters,
    ResourceState,
    ProductCard,
    Pagination,
    Button,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Catálogo"
        description="Productos de todas las tiendas. Filtra por categoría o por municipio."
      />

      <app-catalogo-filters
        [categories]="categoryList()"
        [categoryId]="filter().categoryId ?? ''"
        [municipio]="filter().municipio ?? ''"
        (filtersChange)="applyFilters($event)"
      />

      @if (total() !== null) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        [loading]="products.isLoading()"
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
                [storeName]="storeNames().get(product.storeId) ?? null"
              />
            </li>
          }
        </ul>
        <a
          emptyActions
          app-button
          variant="secondary"
          [routerLink]="emptyView().linkPath"
          [queryParams]="emptyView().linkParams"
          >{{ emptyView().linkLabel }}</a
        >
      </app-resource-state>

      <app-pagination
        ariaLabel="Paginación de productos"
        [page]="filter().page"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class CatalogoList {
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseProductsFilter(this.queryParams()));

  protected readonly products = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listProducts(params),
  });
  private readonly categories = rxResource({ stream: () => this.api.listCategories() });
  private readonly stores = rxResource({ stream: () => this.api.listStoreNames() });

  protected readonly error = computed(() => resourceApiError(this.products.error()));
  protected readonly items = computed(() =>
    this.products.hasValue() ? this.products.value().data : [],
  );
  protected readonly total = computed(() =>
    this.products.hasValue() ? this.products.value().total : null,
  );
  protected readonly totalPages = computed(() =>
    this.products.hasValue() ? this.products.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.total() ?? 0;
    return total === 1 ? '1 producto' : `${total} productos`;
  });

  /** `[]` mientras carga (el selector ya ocupa su sitio); `null` si falló (se oculta). */
  protected readonly categoryList = computed(() => {
    if (this.categories.hasValue()) {
      return this.categories.value();
    }
    return this.categories.error() ? null : [];
  });
  protected readonly categoryNames = computed(
    () =>
      new Map(
        (this.categories.hasValue() ? this.categories.value() : []).map((c) => [c.id, c.nombre]),
      ),
  );
  protected readonly storeNames = computed(
    () =>
      new Map(
        (this.stores.hasValue() ? this.stores.value().data : []).map((s) => [s.id, s.nombre]),
      ),
  );

  /** Qué decir cuando no hay productos: página fuera de rango, filtros sin resultados o catálogo vacío. */
  protected readonly emptyView = computed(() => {
    const { page, ...filters } = this.filter();
    const hasFilters = !!filters.categoryId || !!filters.municipio;
    if (page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay productos en esta página. Vuelve a la primera.',
        linkPath: '/catalogo',
        linkLabel: 'Ir a la primera página',
        linkParams: toQueryParams({ ...filters, page: 1 }),
      };
    }
    if (hasFilters) {
      return {
        title: 'No hay productos con esos filtros',
        description: 'Prueba con otra categoría u otro municipio.',
        linkPath: '/catalogo',
        linkLabel: 'Quitar filtros',
        linkParams: {},
      };
    }
    return {
      title: 'Aún no hay productos',
      description: 'Cuando las tiendas publiquen productos aparecerán aquí.',
      linkPath: '/catalogo/tiendas',
      linkLabel: 'Ver tiendas',
      linkParams: {},
    };
  });

  protected applyFilters(value: FiltersValue): void {
    this.navigate({ ...value, page: 1 });
  }

  protected goToPage(page: number): void {
    const { categoryId, municipio } = this.filter();
    this.navigate({ categoryId, municipio, page });
  }

  protected retry(): void {
    this.products.reload();
    if (this.categories.error()) {
      this.categories.reload();
    }
    if (this.stores.error()) {
      this.stores.reload();
    }
  }

  /** Reemplaza los query params (no los mezcla): un filtro quitado desaparece de la URL. */
  private navigate(next: { categoryId?: string; municipio?: string; page: number }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(next),
    });
  }
}
