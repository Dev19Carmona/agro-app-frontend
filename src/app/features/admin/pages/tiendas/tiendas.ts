import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { StoreDetail } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { AdminFilterField, AdminFilters } from '../../components/admin-filters/admin-filters';
import { StoresFilter } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { filterQuery, parseStoresFilter } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format';

const FIELDS: readonly AdminFilterField[] = [
  { key: 'municipio', label: 'Municipio', kind: 'text' },
];

/**
 * `/admin/tiendas`: todas las tiendas, activas e inactivas, paginadas y con filtro por municipio.
 * `?municipio=` y `?page=` viven en la URL; los valores inválidos se ignoran y cambiar el filtro
 * reinicia la página. Una tienda desactivada lleva el badge «Inactiva».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Table,
    TableCell,
    Button,
    Pagination,
    AdminFilters,
    Badge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Gestión de tiendas"
        description="Todas las tiendas de la plataforma, activas e inactivas."
      />

      <app-admin-filters
        ariaLabel="Filtros de tiendas"
        [fields]="fields"
        [values]="values()"
        (valuesChange)="applyFilters($event)"
      />

      @if (stores.hasValue()) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        emptyIcon="store"
        [loading]="stores.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="stores.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="nombre" let-row>
            <span class="font-semibold wrap-break-word">{{ store(row).nombre }}</span>
            @if (!store(row).activa) {
              <app-badge tone="neutral" class="ml-2">Inactiva</app-badge>
            }
          </ng-template>
          <ng-template appTableCell="createdAt" let-row>
            {{ date(store(row).createdAt) }}
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/admin/tiendas', store(row).id]"
              [ariaLabel]="'Ver la tienda ' + store(row).nombre"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1 || filter().municipio) {
          <a emptyActions app-button variant="secondary" routerLink="/admin/tiendas">
            {{ filter().page > 1 ? 'Ir a la primera página' : 'Quitar los filtros' }}
          </a>
        }
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
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseStoresFilter(this.queryParams()));
  protected readonly values = computed<Record<string, string>>(() => {
    const { municipio } = this.filter();
    const values: Record<string, string> = {};
    if (municipio) {
      values['municipio'] = municipio;
    }
    return values;
  });

  protected readonly stores = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listStores(params),
  });

  protected readonly error = computed(() => resourceApiError(this.stores.error()));
  protected readonly items = computed(() =>
    this.stores.hasValue() ? this.stores.value().data : [],
  );
  protected readonly totalPages = computed(() =>
    this.stores.hasValue() ? this.stores.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.stores.hasValue() ? this.stores.value().total : 0;
    return total === 1 ? '1 tienda' : `${total} tiendas`;
  });
  protected readonly emptyView = computed(() => {
    const { page, municipio } = this.filter();
    if (page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay tiendas en esta página. Vuelve a la primera.',
      };
    }
    return municipio
      ? {
          title: 'No hay tiendas en este municipio',
          description: 'Prueba con otro municipio o quita el filtro.',
        }
      : { title: 'Aún no hay tiendas', description: 'Las tiendas creadas aparecerán aquí.' };
  });

  protected readonly fields = FIELDS;
  protected readonly date = formatDateTime;
  protected readonly columns: TableColumn<StoreDetail>[] = [
    { field: 'nombre', header: 'Tienda' },
    { field: 'municipio', header: 'Municipio' },
    { field: 'nit', header: 'NIT' },
    { field: 'createdAt', header: 'Creada' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected store(row: unknown): StoreDetail {
    return row as StoreDetail;
  }

  /** Cambiar el filtro reinicia la página. */
  protected applyFilters(values: Record<string, string>): void {
    this.navigate({ ...parseStoresFilter({ get: (name) => values[name] ?? null }), page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  private navigate(filter: StoresFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterQuery(filter) });
  }
}
