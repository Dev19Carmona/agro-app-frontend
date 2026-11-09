import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { AdminFilterField, AdminFilters } from '../../components/admin-filters/admin-filters';
import { UserStatusBadge } from '../../components/user-status-badge/user-status-badge';
import { AdminUser, UsersFilter } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { filterQuery, parseUsersFilter } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format';
import { USER_ROLES, USER_STATUSES, userRoleLabel, userStatusLabel } from '../../utils/user-labels';

const FIELDS: readonly AdminFilterField[] = [
  {
    key: 'rol',
    label: 'Rol',
    kind: 'select',
    options: [
      { value: '', label: 'Todos los roles' },
      ...USER_ROLES.map((rol): SelectOption => ({ value: rol, label: userRoleLabel(rol) })),
    ],
  },
  {
    key: 'status',
    label: 'Estado',
    kind: 'select',
    options: [
      { value: '', label: 'Todos los estados' },
      ...USER_STATUSES.map((status): SelectOption => ({
        value: status,
        label: userStatusLabel(status),
      })),
    ],
  },
];

/**
 * `/admin/usuarios`: cuentas paginadas con nombre, correo, rol, estado y fecha (nunca el documento).
 * `?rol=`, `?status=` y `?page=` viven en la URL; los valores inválidos se ignoran y cambiar un
 * filtro reinicia la página.
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
    UserStatusBadge,
    RouterLink,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Usuarios"
        description="Cuentas de la plataforma: aprueba solicitudes de proveedores y gestiona el acceso."
      >
        <a
          actions
          app-button
          variant="secondary"
          routerLink="/admin/usuarios"
          [queryParams]="{ status: 'PENDING_APPROVAL' }"
        >
          Ver solicitudes pendientes
        </a>
      </app-page-header>

      <app-admin-filters
        ariaLabel="Filtros de usuarios"
        [fields]="fields"
        [values]="values()"
        (valuesChange)="applyFilters($event)"
      />

      @if (users.hasValue()) {
        <p class="text-sm text-fg-muted" aria-live="polite">{{ totalText() }}</p>
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyView().title"
        [emptyDescription]="emptyView().description"
        emptyIcon="users"
        [loading]="users.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="users.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="nombre" let-row>
            <span class="font-semibold wrap-break-word">{{ user(row).nombre }}</span>
          </ng-template>
          <ng-template appTableCell="email" let-row>
            <span class="wrap-break-word">{{ user(row).email }}</span>
          </ng-template>
          <ng-template appTableCell="rol" let-row>
            {{ role(user(row)) }}
          </ng-template>
          <ng-template appTableCell="status" let-row>
            <app-user-status-badge [status]="user(row).status" />
          </ng-template>
          <ng-template appTableCell="createdAt" let-row>
            {{ date(user(row).createdAt) }}
          </ng-template>
          <ng-template appTableCell="id" let-row>
            <a
              app-button
              variant="secondary"
              size="sm"
              [routerLink]="['/admin/usuarios', user(row).id]"
              [ariaLabel]="'Ver el usuario ' + user(row).nombre"
              >Ver detalle</a
            >
          </ng-template>
        </app-table>
        @if (filter().page > 1 || hasFilters()) {
          <a emptyActions app-button variant="secondary" routerLink="/admin/usuarios">
            {{ filter().page > 1 ? 'Ir a la primera página' : 'Quitar los filtros' }}
          </a>
        }
      </app-resource-state>

      <app-pagination
        ariaLabel="Paginación de usuarios"
        [page]="filter().page"
        [totalPages]="totalPages()"
        (pageChange)="goToPage($event)"
      />
    </div>
  `,
})
export class Usuarios {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed(() => parseUsersFilter(this.queryParams()));
  protected readonly values = computed<Record<string, string>>(() => {
    const { rol, status } = this.filter();
    const values: Record<string, string> = {};
    if (rol) {
      values['rol'] = rol;
    }
    if (status) {
      values['status'] = status;
    }
    return values;
  });
  protected readonly hasFilters = computed(() => Object.keys(this.values()).length > 0);

  protected readonly users = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.api.listUsers(params),
  });

  protected readonly error = computed(() => resourceApiError(this.users.error()));
  protected readonly items = computed(() => (this.users.hasValue() ? this.users.value().data : []));
  protected readonly totalPages = computed(() =>
    this.users.hasValue() ? this.users.value().totalPages : 0,
  );
  protected readonly totalText = computed(() => {
    const total = this.users.hasValue() ? this.users.value().total : 0;
    return total === 1 ? '1 usuario' : `${total} usuarios`;
  });
  protected readonly emptyView = computed(() => {
    if (this.filter().page > 1) {
      return {
        title: 'Esta página no existe',
        description: 'No hay usuarios en esta página. Vuelve a la primera.',
      };
    }
    return this.hasFilters()
      ? {
          title: 'No hay usuarios con estos filtros',
          description: 'Prueba con otro rol u otro estado, o quita los filtros.',
        }
      : { title: 'Aún no hay usuarios', description: 'Las cuentas registradas aparecerán aquí.' };
  });

  protected readonly fields = FIELDS;
  protected readonly date = formatDateTime;
  protected readonly columns: TableColumn<AdminUser>[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'email', header: 'Correo' },
    { field: 'rol', header: 'Rol' },
    { field: 'status', header: 'Estado' },
    { field: 'createdAt', header: 'Registro' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected user(row: unknown): AdminUser {
    return row as AdminUser;
  }

  protected role(user: AdminUser): string {
    return userRoleLabel(user.rol);
  }

  /** Cambiar un filtro reinicia la página. */
  protected applyFilters(values: Record<string, string>): void {
    this.navigate({ ...parseUsersFilter({ get: (name) => values[name] ?? null }), page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.filter(), page });
  }

  private navigate(filter: UsersFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterQuery(filter) });
  }
}
