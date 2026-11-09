import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SessionRefresher } from '../../../../core/auth';
import { resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StoreForm } from '../../components/store-form/store-form';
import type { StoreDetail } from '../../../../core/catalog';
import { ProveedorApi } from '../../services/proveedor-api';
import { formatDate } from '../../utils/format-date';

const REFRESH_FAILED =
  'Tu tienda se creó, pero no se pudo actualizar la sesión. Vuelve a iniciar sesión para ver tus pedidos';

/**
 * `/proveedor/tienda`. Sin tienda (`404` de `GET /catalog/my-store`) muestra el formulario de
 * creación; con tienda, una ficha de solo lectura. Tras crearla se renueva la sesión
 * (`POST /auth/refresh`) para que el access token traiga `storeId`; si eso falla, la tienda sigue
 * visible y se avisa que hay que volver a iniciar sesión.
 */
@Component({
  imports: [PageHeader, ResourceState, Card, Badge, Alert, Button, RouterLink, StoreForm],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Mi tienda"
        [description]="
          store() ? 'Los datos de tu tienda.' : 'Crea tu tienda para publicar productos.'
        "
      />

      <app-resource-state
        skeleton="detail"
        [loading]="resource.isLoading()"
        [error]="error()"
        (retry)="resource.reload()"
      >
        @if (store(); as current) {
          <div class="space-y-4">
            @if (justCreated()) {
              <app-alert variant="success">Tu tienda se creó correctamente.</app-alert>
            }
            @if (sessionWarning()) {
              <app-alert variant="info" title="Vuelve a iniciar sesión">{{
                sessionWarning()
              }}</app-alert>
            }
            @if (!current.activa) {
              <app-alert variant="info" title="Tienda desactivada">
                Tu tienda está desactivada: no aparece en el catálogo y no admite productos nuevos.
              </app-alert>
            }

            <app-card padding="lg" class="space-y-6">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-2xl">{{ current.nombre }}</h2>
                <app-badge [tone]="current.activa ? 'success' : 'neutral'">{{
                  current.activa ? 'Activa' : 'Desactivada'
                }}</app-badge>
              </div>
              <dl class="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm text-fg-muted">NIT</dt>
                  <dd class="font-semibold">{{ current.nit }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-fg-muted">Municipio</dt>
                  <dd class="font-semibold">{{ current.municipio }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-fg-muted">Estado</dt>
                  <dd class="font-semibold">{{ current.activa ? 'Activa' : 'Desactivada' }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-fg-muted">Creada</dt>
                  <dd class="font-semibold">{{ formatDate(current.createdAt) }}</dd>
                </div>
              </dl>
              @if (current.activa) {
                <a app-button variant="secondary" [routerLink]="['/catalogo/tiendas', current.id]"
                  >Ver mi página pública</a
                >
              }
            </app-card>
          </div>
        } @else {
          <app-card padding="lg" class="space-y-4">
            <h2 class="text-2xl">Crear mi tienda</h2>
            <p class="text-fg-muted">
              Cada proveedor administra una sola tienda. Podrás publicar productos cuando la crees.
            </p>
            <app-store-form (created)="onCreated($event)" />
          </app-card>
        }
      </app-resource-state>
    </div>
  `,
})
export class MiTienda {
  private readonly api = inject(ProveedorApi);
  private readonly refresher = inject(SessionRefresher);

  protected readonly resource = rxResource({ stream: () => this.api.getMyStore() });
  private readonly created = signal<StoreDetail | null>(null);

  protected readonly justCreated = computed(() => this.created() !== null);
  protected readonly sessionWarning = signal<string | null>(null);

  protected readonly store = computed<StoreDetail | null>(
    () => this.created() ?? (this.resource.hasValue() ? this.resource.value() : null),
  );

  /** El `404` («sin tienda») no es un error: muestra el formulario. */
  protected readonly error = computed(() => {
    const apiError = resourceApiError(this.resource.error());
    return apiError?.status === 404 ? null : apiError;
  });

  protected readonly formatDate = formatDate;

  protected async onCreated(store: StoreDetail): Promise<void> {
    this.created.set(store);
    try {
      await this.refresher.refresh();
    } catch {
      this.sessionWarning.set(REFRESH_FAILED);
    }
  }
}
