import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { ApiError, resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { NoStoreNotice } from '../../components/no-store-notice/no-store-notice';
import { StockSummary } from '../../components/stock-summary/stock-summary';
import { MyProduct } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import { pageQuery, parsePage } from '../../utils/page-param';

/**
 * `/proveedor/productos`: productos propios (activos e inactivos) con estado, categoría, número
 * de presentaciones y stock disponible, paginados con `?page=`. Sin tienda muestra «Aún no tienes
 * una tienda»; con la tienda desactivada, «Nuevo producto» va deshabilitado.
 *
 * El stock disponible suma solo las presentaciones activas (las inactivas no se pueden comprar).
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Table,
    TableCell,
    Badge,
    Alert,
    Button,
    Pagination,
    RouterLink,
    NoStoreNotice,
    StockSummary,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Mis productos"
        description="Productos de tu tienda. Los productos no se borran: se desactivan."
      >
        @if (store.hasValue() && store.value().activa) {
          <a actions app-button routerLink="/proveedor/productos/nuevo">Nuevo producto</a>
        } @else if (store.hasValue()) {
          <button actions app-button disabled>Nuevo producto</button>
        }
      </app-page-header>

      @if (noStore()) {
        <app-no-store-notice />
      } @else {
        @if (store.hasValue() && !store.value().activa) {
          <app-alert variant="info" title="Tienda desactivada">
            Tu tienda está desactivada: no aparece en el catálogo y no admite productos nuevos.
          </app-alert>
        }

        @if (products.hasValue()) {
          <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
        }

        <app-resource-state
          skeleton="table"
          [emptyTitle]="emptyView().title"
          [emptyDescription]="emptyView().description"
          [loading]="isLoading()"
          [error]="error()"
          [empty]="items().length === 0"
          (retry)="retry()"
        >
          <app-table [data]="items()" [columns]="columns">
            <ng-template appTableCell="nombre" let-row>
              <span class="font-semibold">{{ product(row).nombre }}</span>
              <span class="block text-sm text-fg-muted">{{ product(row).marca }}</span>
            </ng-template>
            <ng-template appTableCell="categoryId" let-row>
              {{ categoryNames().get(product(row).categoryId) ?? '—' }}
            </ng-template>
            <ng-template appTableCell="activo" let-row>
              <app-badge [tone]="product(row).activo ? 'success' : 'neutral'">{{
                product(row).activo ? 'Activo' : 'Inactivo'
              }}</app-badge>
            </ng-template>
            <ng-template appTableCell="variantes" let-row>
              @if (product(row).variantes.length === 0) {
                <span class="text-fg-muted">Sin presentaciones</span>
              } @else {
                <span class="block text-sm">{{ presentationsText(product(row)) }}</span>
                <app-stock-summary
                  compact
                  [stock]="stockOf(product(row)).stock"
                  [reservado]="stockOf(product(row)).reservado"
                  [disponible]="stockOf(product(row)).disponible"
                />
              }
            </ng-template>
            <ng-template appTableCell="id" let-row>
              <a
                app-button
                variant="secondary"
                size="sm"
                [routerLink]="['/proveedor/productos', product(row).id]"
                [ariaLabel]="'Editar ' + product(row).nombre"
                >Editar</a
              >
            </ng-template>
          </app-table>
          @if (page() > 1) {
            <a emptyActions app-button variant="secondary" routerLink="/proveedor/productos"
              >Ir a la primera página</a
            >
          } @else if (store.hasValue() && store.value().activa) {
            <a emptyActions app-button routerLink="/proveedor/productos/nuevo">Nuevo producto</a>
          }
        </app-resource-state>

        <app-pagination
          ariaLabel="Paginación de mis productos"
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      }
    </div>
  `,
})
export class MisProductos {
  private readonly api = inject(ProveedorApi);
  private readonly catalog = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly page = computed(() => parsePage(this.queryParams().get('page')));

  protected readonly store = rxResource({ stream: () => this.api.getMyStore() });
  protected readonly products = rxResource({
    params: () => ({ page: this.page() }),
    stream: ({ params }) => this.api.listMyProducts(params.page),
  });
  /** El nombre de la categoría es un extra: si falla, la fila muestra «—». */
  private readonly categories = rxResource({ stream: () => this.catalog.listCategories() });

  private readonly storeError = computed(() => resourceApiError(this.store.error()));
  private readonly productsError = computed(() => resourceApiError(this.products.error()));

  protected readonly noStore = computed(
    () => this.storeError()?.status === 404 || this.productsError()?.status === 404,
  );
  protected readonly error = computed<ApiError | null>(() => {
    const store = this.storeError();
    return store && store.status !== 404 ? store : this.productsError();
  });
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
          title: 'Aún no tienes productos',
          description: 'Crea tu primer producto para empezar a vender.',
        },
  );

  protected readonly columns: TableColumn<MyProduct>[] = [
    { field: 'nombre', header: 'Producto' },
    { field: 'categoryId', header: 'Categoría' },
    { field: 'activo', header: 'Estado' },
    { field: 'variantes', header: 'Presentaciones y stock' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected product(row: unknown): MyProduct {
    return row as MyProduct;
  }

  protected presentationsText(product: MyProduct): string {
    const n = product.variantes.length;
    return n === 1 ? '1 presentación' : `${n} presentaciones`;
  }

  /** Suma de las presentaciones activas. */
  protected stockOf(product: MyProduct): { stock: number; reservado: number; disponible: number } {
    return product.variantes
      .filter((v) => v.activo)
      .reduce(
        (sum, v) => ({
          stock: sum.stock + v.stock,
          reservado: sum.reservado + v.stockReservado,
          disponible: sum.disponible + v.disponible,
        }),
        { stock: 0, reservado: 0, disponible: 0 },
      );
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: pageQuery(page) });
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
