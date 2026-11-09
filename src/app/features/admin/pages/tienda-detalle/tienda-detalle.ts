import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { StoreDetail } from '../../../../core/catalog';
import { ApiError, resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { AdminStoreForm } from '../../components/store-form/store-form';
import { AdminApi } from '../../services/admin-api';
import { isObjectId } from '../../utils/filter-params';
import { formatDateTime } from '../../utils/format';

/**
 * `/admin/tiendas/:id`: datos y edición de la tienda (nombre, NIT, municipio), enlace al dueño y a
 * la ficha pública, y **Desactivar tienda** con confirmación. Desactivar es definitivo: ya inactiva,
 * el botón queda deshabilitado con la explicación. Un id inválido o inexistente muestra «Tienda no
 * encontrada».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Button,
    Alert,
    Badge,
    Dialog,
    EmptyState,
    RouterLink,
    AdminStoreForm,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Detalle de tienda" description="Datos de la tienda y su estado.">
        <a actions app-button variant="secondary" routerLink="/admin/tiendas"> Volver a tiendas </a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Tienda no encontrada"
          description="La tienda no existe o el enlace no es válido."
          icon="store"
        >
          <a actions app-button routerLink="/admin/tiendas">Ver tiendas</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="resource.isLoading() && !store()"
          [error]="store() ? null : error()"
          (retry)="resource.reload()"
        >
          @if (store(); as s) {
            <div class="space-y-6">
              @if (message(); as m) {
                <app-alert [variant]="m.variant">{{ m.text }}</app-alert>
              }

              <app-card padding="lg" class="space-y-6">
                <dl class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm text-fg-muted">Estado</dt>
                    <dd>
                      @if (s.activa) {
                        <app-badge tone="success">Activa</app-badge>
                      } @else {
                        <app-badge tone="neutral">Inactiva</app-badge>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Creada</dt>
                    <dd>{{ date(s.createdAt) }}</dd>
                  </div>
                </dl>
                <div class="flex flex-wrap gap-2">
                  <a app-button variant="secondary" [routerLink]="['/admin/usuarios', s.ownerId]">
                    Ver dueño
                  </a>
                  <a app-button variant="secondary" [routerLink]="['/catalogo/tiendas', s.id]">
                    Ver ficha pública
                  </a>
                </div>
              </app-card>

              <section aria-labelledby="editar-titulo" class="space-y-3">
                <h2 id="editar-titulo" class="text-2xl">Editar datos</h2>
                <app-card padding="lg">
                  <app-admin-store-form [store]="s" (saved)="onSaved($event)" />
                </app-card>
              </section>

              <section aria-labelledby="desactivar-titulo" class="space-y-3">
                <h2 id="desactivar-titulo" class="text-2xl">Desactivar tienda</h2>
                <p class="text-fg-muted" id="desactivar-ayuda">
                  @if (s.activa) {
                    La tienda y sus productos dejan de aparecer en el catálogo. No se puede
                    deshacer.
                  } @else {
                    Una tienda desactivada no se reactiva.
                  }
                </p>
                <button
                  app-button
                  variant="danger"
                  aria-describedby="desactivar-ayuda"
                  [disabled]="!s.activa || busy()"
                  (click)="confirmOpen.set(true)"
                >
                  Desactivar tienda
                </button>
              </section>
            </div>

            <app-dialog
              [(open)]="confirmOpen"
              title="Desactivar tienda"
              [description]="
                'Vas a desactivar «' +
                s.nombre +
                '». Es definitivo: una tienda desactivada no se reactiva.'
              "
              confirmLabel="Desactivar tienda"
              variant="danger"
              [busy]="busy()"
              (confirmed)="deactivate(s.id)"
            />
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class TiendaDetalle {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Con un id inválido no se pide nada. */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));

  protected readonly resource = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.api.getStore(params),
  });

  /** La tienda mostrada: la de la carga, o la que devolvió el último cambio. */
  protected readonly store = linkedSignal<StoreDetail | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = this.apiError;

  protected readonly confirmOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly message = signal<{ variant: 'success' | 'danger'; text: string } | null>(null);
  protected readonly date = formatDateTime;

  protected onSaved(store: StoreDetail): void {
    this.store.set(store);
    this.message.set({ variant: 'success', text: 'Cambios guardados.' });
  }

  protected deactivate(id: string): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    this.api
      .deactivateStore(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (store) => {
          this.store.set(store);
          this.message.set({ variant: 'success', text: 'Tienda desactivada.' });
          this.confirmOpen.set(false);
        },
        error: (error: ApiError) => {
          this.message.set({ variant: 'danger', text: error.message });
          this.confirmOpen.set(false);
        },
      });
  }
}
