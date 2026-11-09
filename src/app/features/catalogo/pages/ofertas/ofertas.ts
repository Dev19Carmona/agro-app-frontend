import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { CatalogoState } from '../../components/catalogo-state/catalogo-state';
import { VariantsTable } from '../../components/variants-table/variants-table';
import { CatalogoApi } from '../../services/catalogo-api';
import { parsePageParam, toQueryParams } from '../../utils/filter-params';
import { resourceApiError } from '../../utils/resource-error';

/**
 * `/catalogo/ofertas`: presentaciones con precio de oferta. El backend devuelve solo el
 * `productId`, así que por cada producto distinto de la página se consulta `GET /catalog/products/:id`
 * una sola vez, en paralelo, para mostrar su nombre y enlace.
 *
 * Las filas no esperan por los nombres: salen en cuanto llegan las ofertas. Si la consulta de un
 * producto falla, esa fila se queda con la presentación, el precio y el enlace sin nombre.
 */
@Component({
  imports: [PageHeader, CatalogoState, VariantsTable, Pagination, Button, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header title="Ofertas" description="Presentaciones con precio de oferta vigente." />

      @if (total() !== null) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-catalogo-state
        skeleton="detail"
        emptyIcon="tag"
        [loading]="offers.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        (retry)="retry()"
      >
        <section aria-labelledby="ofertas-titulo" class="space-y-3">
          <h2 id="ofertas-titulo" class="sr-only">Presentaciones en oferta</h2>
          <app-variants-table [variants]="items()" [showProduct]="true" [productNames]="names()" />
        </section>
        <a
          emptyActions
          app-button
          variant="secondary"
          [routerLink]="emptyView().linkPath"
          [queryParams]="emptyView().linkParams"
          >{{ emptyView().linkLabel }}</a
        >
      </app-catalogo-state>

      <app-pagination
        ariaLabel="Paginación de ofertas"
        [page]="page()"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class Ofertas {
  private readonly api = inject(CatalogoApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly page = computed(() => parsePageParam(this.queryParams()));

  protected readonly offers = rxResource({
    params: () => this.page(),
    stream: ({ params }) => this.api.listOffers(params),
  });

  /** Productos distintos de la página actual, en orden de aparición. */
  private readonly productIds = computed(() =>
    this.offers.hasValue()
      ? [...new Set(this.offers.value().data.map((variant) => variant.productId))]
      : undefined,
  );

  /** `productId` → nombre. Los productos cuya consulta falló no aparecen. */
  private readonly productNames = rxResource({
    params: () => this.productIds(),
    stream: ({ params }): Observable<Map<string, string>> =>
      // `forkJoin([])` completa sin emitir y una resource lo toma como error.
      params.length === 0
        ? of(new Map<string, string>())
        : forkJoin(
            params.map((id) =>
              this.api.getProduct(id).pipe(
                map((product) => [id, product.nombre] as const),
                catchError(() => of([id, null] as const)),
              ),
            ),
          ).pipe(
            map(
              (pairs) =>
                new Map(
                  pairs.filter((pair): pair is readonly [string, string] => pair[1] !== null),
                ),
            ),
          ),
  });

  protected readonly names = computed(() =>
    this.productNames.hasValue() ? this.productNames.value() : new Map<string, string>(),
  );
  protected readonly error = computed(() => resourceApiError(this.offers.error()));
  protected readonly items = computed(() =>
    this.offers.hasValue() ? this.offers.value().data : [],
  );
  protected readonly total = computed(() =>
    this.offers.hasValue() ? this.offers.value().total : null,
  );
  protected readonly totalPages = computed(() =>
    this.offers.hasValue() ? this.offers.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.total() ?? 0;
    return total === 1 ? '1 oferta' : `${total} ofertas`;
  });

  protected readonly emptyView = computed(() =>
    this.page() > 1
      ? {
          title: 'Esta página no existe',
          description: 'No hay ofertas en esta página. Vuelve a la primera.',
          linkPath: '/catalogo/ofertas',
          linkParams: {},
          linkLabel: 'Ir a la primera página',
        }
      : {
          title: 'No hay ofertas por ahora',
          description: 'Vuelve más tarde o explora el catálogo.',
          linkPath: '/catalogo',
          linkParams: {},
          linkLabel: 'Ver el catálogo',
        },
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams({ page }),
    });
  }

  protected retry(): void {
    this.offers.reload();
  }
}
