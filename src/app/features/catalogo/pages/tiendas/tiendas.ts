import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { CatalogoFilters } from '../../components/catalogo-filters/catalogo-filters';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StoreCard } from '../../components/store-card/store-card';
import { FiltersValue } from '../../models/catalogo.types';
import { parseStoresFilter, toQueryParams } from '../../utils/filter-params';

/**
 * `/catalogo/tiendas`: directorio de tiendas activas con filtro por municipio y paginación. El
 * municipio y la página viven en la URL (`?municipio=…&page=…`).
 */
@Component({
  imports: [PageHeader, CatalogoFilters, ResourceState, StoreCard, Pagination, Button, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Tiendas"
        description="Las tiendas que venden en Mini-Croper. Filtra por municipio."
      />

      <app-catalogo-filters
        [municipio]="filter().municipio ?? ''"
        (filtersChange)="applyFilters($event)"
      />

      @if (total() !== null) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        [loading]="stores.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        emptyIcon="store"
        (retry)="stores.reload()"
      >
        <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (store of items(); track store.id) {
            <li><app-store-card [store]="store" /></li>
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
        ariaLabel="Paginación de tiendas"
        [page]="filter().page"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class Tiendas {
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseStoresFilter(this.queryParams()));

  protected readonly stores = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listStores(params),
  });

  protected readonly error = computed(() => resourceApiError(this.stores.error()));
  protected readonly items = computed(() =>
    this.stores.hasValue() ? this.stores.value().data : [],
  );
  protected readonly total = computed(() =>
    this.stores.hasValue() ? this.stores.value().total : null,
  );
  protected readonly totalPages = computed(() =>
    this.stores.hasValue() ? this.stores.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.total() ?? 0;
    return total === 1 ? '1 tienda' : `${total} tiendas`;
  });

  protected readonly emptyView = computed(() => {
    const { page, municipio } = this.filter();
    if (page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay tiendas en esta página. Vuelve a la primera.',
        linkPath: '/catalogo/tiendas',
        linkLabel: 'Ir a la primera página',
        linkParams: toQueryParams({ municipio, page: 1 }),
      };
    }
    if (municipio) {
      return {
        title: 'No hay tiendas en ese municipio',
        description: 'Prueba con otro municipio.',
        linkPath: '/catalogo/tiendas',
        linkLabel: 'Quitar filtro',
        linkParams: {},
      };
    }
    return {
      title: 'Aún no hay tiendas',
      description: 'Cuando haya tiendas activas aparecerán aquí.',
      linkPath: '/catalogo',
      linkLabel: 'Ver el catálogo',
      linkParams: {},
    };
  });

  protected applyFilters(value: FiltersValue): void {
    this.navigate({ municipio: value.municipio, page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ municipio: this.filter().municipio, page });
  }

  private navigate(next: { municipio?: string; page: number }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(next),
    });
  }
}
