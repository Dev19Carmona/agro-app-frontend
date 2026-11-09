import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth';
import { resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { UserActions } from '../../components/user-actions/user-actions';
import { UserStatusBadge } from '../../components/user-status-badge/user-status-badge';
import { AdminUser } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { isObjectId } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format';
import { userRoleLabel } from '../../utils/user-labels';

/**
 * `/admin/usuarios/:id`: datos del usuario (el documento solo se ve aquí), motivo y fecha de
 * revisión si los hay, acciones según su estado y enlaces a su tienda, sus pedidos y sus pagos.
 * Tras una acción se usa el usuario que devuelve el backend, sin recargar. Un id inválido o
 * inexistente muestra «Usuario no encontrado».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Button,
    EmptyState,
    RouterLink,
    UserActions,
    UserStatusBadge,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Detalle de usuario" description="Datos de la cuenta y acciones.">
        <a actions app-button variant="secondary" routerLink="/admin/usuarios">
          Volver a usuarios
        </a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Usuario no encontrado"
          description="El usuario no existe o el enlace no es válido."
          icon="users"
        >
          <a actions app-button routerLink="/admin/usuarios">Ver usuarios</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="resource.isLoading() && !user()"
          [error]="user() ? null : error()"
          (retry)="resource.reload()"
        >
          @if (user(); as u) {
            <div class="space-y-6">
              <app-card padding="lg" class="space-y-6">
                <dl class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm text-fg-muted">Nombre</dt>
                    <dd class="font-semibold wrap-break-word">{{ u.nombre }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Correo</dt>
                    <dd class="wrap-break-word">{{ u.email }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Documento</dt>
                    <dd class="wrap-break-word">{{ u.documento }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Rol</dt>
                    <dd>{{ role(u) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Estado</dt>
                    <dd><app-user-status-badge [status]="u.status" /></dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Registro</dt>
                    <dd>{{ date(u.createdAt) }}</dd>
                  </div>
                  @if (u.reviewedAt) {
                    <div>
                      <dt class="text-sm text-fg-muted">Revisada</dt>
                      <dd>{{ date(u.reviewedAt) }}</dd>
                    </div>
                  }
                  @if (u.rejectionReason) {
                    <div class="sm:col-span-2">
                      <dt class="text-sm text-fg-muted">Motivo del rechazo</dt>
                      <dd class="wrap-break-word">{{ u.rejectionReason }}</dd>
                    </div>
                  }
                </dl>
              </app-card>

              <section aria-labelledby="acciones-titulo" class="space-y-3">
                <h2 id="acciones-titulo" class="text-2xl">Acciones</h2>
                <app-user-actions
                  [user]="u"
                  [currentUserId]="currentUserId()"
                  (userChange)="user.set($event)"
                />
              </section>

              <section aria-labelledby="enlaces-titulo" class="space-y-3">
                <h2 id="enlaces-titulo" class="text-2xl">Relacionado</h2>
                <div class="flex flex-wrap gap-2">
                  @if (u.storeId) {
                    <a app-button variant="secondary" [routerLink]="['/admin/tiendas', u.storeId]">
                      Ver tienda
                    </a>
                  }
                  @if (u.rol === 'PRODUCTOR') {
                    <a
                      app-button
                      variant="secondary"
                      routerLink="/admin/pedidos"
                      [queryParams]="{ buyerId: u.id }"
                    >
                      Ver sus pedidos
                    </a>
                    <a
                      app-button
                      variant="secondary"
                      routerLink="/admin/pagos"
                      [queryParams]="{ buyerId: u.id }"
                    >
                      Ver sus pagos
                    </a>
                  }
                </div>
              </section>
            </div>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class UsuarioDetalle {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Con un id inválido no se pide nada. */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));

  protected readonly resource = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.api.getUser(params),
  });

  /** El usuario mostrado: el de la carga, o el que devolvió la última acción. */
  protected readonly user = linkedSignal<AdminUser | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = this.apiError;

  protected readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  protected readonly date = formatDateTime;

  protected role(user: AdminUser): string {
    return userRoleLabel(user.rol);
  }
}
