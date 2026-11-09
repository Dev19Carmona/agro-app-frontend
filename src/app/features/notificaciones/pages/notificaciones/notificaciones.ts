import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import {
  NOTIFICATIONS_EMPTY_MESSAGE,
  NOTIFICATIONS_PAGE_SIZE,
  NotificationItem,
  NotificationsFilter,
  NotificationsService,
  notificationsErrorMessage,
} from '../../../../core/notifications';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { notificationsFilterQuery, parseNotificationsFilter } from '../../utils/filter-params';

/**
 * `/notificaciones`: historial de avisos del productor o del proveedor, del más nuevo al más viejo,
 * de 20 en 20 con **Cargar más** por cursor. `?filtro=no-leidas` vive en la URL; es un filtro del
 * cliente sobre lo ya cargado, así que si quedan páginas puede mostrar menos de lo esperado.
 */
@Component({
  imports: [PageHeader, ResourceState, NotificationItem, Button, Alert],
  template: `
    <div class="space-y-6">
      <app-page-header title="Notificaciones" description="Avisos de tus pagos, pedidos y cuenta.">
        <button
          actions
          app-button
          variant="secondary"
          [disabled]="!canMarkAll()"
          (click)="markAll()"
        >
          Marcar todas como leídas
        </button>
      </app-page-header>

      <div role="group" aria-label="Filtrar avisos" class="flex flex-wrap gap-2">
        @for (option of filters; track option.value) {
          <button
            app-button
            size="sm"
            [variant]="filter() === option.value ? 'primary' : 'secondary'"
            [attr.aria-pressed]="filter() === option.value"
            (click)="setFilter(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      @if (service.degraded()) {
        <app-alert variant="info"
          >No se pudo actualizar el contador de avisos. Se reintentará en unos minutos.</app-alert
        >
      }

      <app-resource-state
        skeleton="table"
        [emptyTitle]="emptyMessage"
        emptyIcon="bell"
        [loading]="service.listStatus() === 'loading' && service.items().length === 0"
        [error]="error()"
        [empty]="service.listStatus() === 'ready' && service.items().length === 0"
        (retry)="load()"
      >
        @if (visible().length > 0) {
          <ul
            class="m-0 list-none divide-y divide-line rounded-xl border border-line bg-surface p-2"
          >
            @for (item of visible(); track item.id) {
              <li>
                <app-notification-item [notification]="item" (select)="service.open($event)" />
              </li>
            }
          </ul>
        } @else {
          <p class="rounded-xl border border-line bg-surface p-4 text-fg-muted">
            {{
              service.hasMore()
                ? 'No hay avisos sin leer en lo cargado'
                : 'No tienes avisos sin leer'
            }}
          </p>
        }

        @if (loadMoreError()) {
          <app-alert variant="danger">{{ loadMoreError() }}</app-alert>
        }
        @if (service.hasMore()) {
          <div class="flex justify-center pt-4">
            <button
              app-button
              variant="secondary"
              [disabled]="service.listStatus() === 'loading'"
              (click)="loadMore()"
            >
              Cargar más
            </button>
          </div>
        }
      </app-resource-state>
    </div>
  `,
  host: { class: 'block' },
})
export class Notificaciones {
  protected readonly service = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly emptyMessage = NOTIFICATIONS_EMPTY_MESSAGE;
  protected readonly filters: readonly { value: NotificationsFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'no-leidas', label: 'No leídas' },
  ];

  protected readonly filter = toSignal(
    this.route.queryParamMap.pipe(map((params) => parseNotificationsFilter(params))),
    { initialValue: parseNotificationsFilter(this.route.snapshot.queryParamMap) },
  );

  private readonly _loadMoreError = signal<string | null>(null);
  protected readonly loadMoreError = this._loadMoreError.asReadonly();

  protected readonly visible = computed(() => {
    const items = this.service.items();
    return this.filter() === 'no-leidas' ? items.filter((item) => item.readAt === null) : items;
  });
  protected readonly error = computed(() => {
    const error = this.service.listError();
    return this.service.listStatus() === 'error' && error
      ? { message: notificationsErrorMessage(error) }
      : null;
  });
  protected readonly canMarkAll = computed(
    () => this.service.unreadCount() > 0 && !this.service.markingAll(),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this._loadMoreError.set(null);
    void this.service.loadList(NOTIFICATIONS_PAGE_SIZE);
  }

  protected async loadMore(): Promise<void> {
    this._loadMoreError.set(null);
    const result = await this.service.loadMore();
    if (!result.ok) {
      this._loadMoreError.set(notificationsErrorMessage(result.error));
    }
  }

  protected markAll(): void {
    void this.service.markAllRead();
  }

  protected setFilter(filter: NotificationsFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: notificationsFilterQuery(filter),
      replaceUrl: true,
    });
  }
}
