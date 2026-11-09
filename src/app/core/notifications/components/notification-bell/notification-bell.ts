import { Component, computed, effect, inject, model, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Popover, PopoverTrigger } from '../../../../shared/ui/popover/popover';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { AppNotification, NOTIFICATIONS_PANEL_SIZE } from '../../models/notifications.types';
import { NotificationsService } from '../../services/notifications';
import {
  NOTIFICATIONS_EMPTY_MESSAGE,
  notificationsErrorMessage,
} from '../../utils/notifications-messages';
import { unreadBadgeText } from '../../utils/notification-presentation';
import { NotificationItem } from '../notification-item/notification-item';

/**
 * Campana del header para el `PRODUCTOR` y el `PROVEEDOR`: icono con la insignia de avisos sin
 * leer y, al pulsarla, un panel con los últimos 10, **Marcar todas como leídas** y **Ver todas**.
 *
 * La lista se pide al abrir el panel. Con el sondeo en fallo (`degraded`) no hay insignia y el
 * panel lo avisa. Pulsar un aviso lo marca como leído y, si trae pedido, navega a él según el rol.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [
    Popover,
    PopoverTrigger,
    Button,
    Icon,
    Alert,
    ResourceState,
    NotificationItem,
    RouterLink,
  ],
  template: `
    <app-popover [(open)]="open" ariaLabel="Últimos avisos" align="end">
      <button
        appPopoverTrigger
        app-button
        class="relative"
        variant="ghost"
        iconOnly
        [ariaLabel]="label()"
      >
        <app-icon name="bell" />
        @if (showBadge()) {
          <span
            aria-hidden="true"
            class="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand px-1 text-xs font-semibold text-on-brand"
            >{{ badge() }}</span
          >
        }
      </button>

      @if (open()) {
        <div class="space-y-2 p-2">
          <div class="flex items-center justify-between gap-2 px-2 pt-1">
            <h2 class="font-serif text-lg">Notificaciones</h2>
            <button
              app-button
              variant="ghost"
              size="sm"
              [disabled]="!canMarkAll()"
              (click)="markAll()"
            >
              Marcar todas como leídas
            </button>
          </div>

          @if (service.degraded()) {
            <app-alert variant="info"
              >No se pudo actualizar el contador de avisos. Se reintentará en unos
              minutos.</app-alert
            >
          }

          <app-resource-state
            skeleton="detail"
            [emptyTitle]="emptyMessage"
            emptyIcon="bell"
            [loading]="service.listStatus() === 'loading' && panelItems().length === 0"
            [error]="error()"
            [empty]="service.listStatus() === 'ready' && panelItems().length === 0"
            (retry)="load()"
          >
            <ul class="m-0 list-none space-y-1 p-0">
              @for (item of panelItems(); track item.id) {
                <li><app-notification-item [notification]="item" (select)="onSelect($event)" /></li>
              }
            </ul>
          </app-resource-state>

          <div class="border-t border-line px-2 pt-2 pb-1">
            <a
              routerLink="/notificaciones"
              class="font-semibold text-brand-text underline"
              (click)="open.set(false)"
              >Ver todas</a
            >
          </div>
        </div>
      }
    </app-popover>
    <span class="sr-only" aria-live="polite">{{ announcement() }}</span>
  `,
  host: { class: 'inline-flex' },
})
export class NotificationBell {
  protected readonly service = inject(NotificationsService);

  protected readonly open = model(false);
  protected readonly emptyMessage = NOTIFICATIONS_EMPTY_MESSAGE;

  protected readonly showBadge = computed(
    () => this.service.unreadCount() > 0 && !this.service.degraded(),
  );
  protected readonly badge = computed(() => unreadBadgeText(this.service.unreadCount()));
  protected readonly label = computed(() =>
    this.showBadge() ? `Notificaciones, ${this.service.unreadCount()} sin leer` : 'Notificaciones',
  );
  /** Texto de la región `aria-live`: anuncia el cambio del contador a lectores de pantalla. */
  protected readonly announcement = computed(() => {
    const count = this.service.unreadCount();
    if (!this.showBadge()) {
      return '';
    }
    return `${count} ${count === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`;
  });

  protected readonly panelItems = computed(() =>
    this.service.items().slice(0, NOTIFICATIONS_PANEL_SIZE),
  );
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
    effect(() => {
      if (this.open()) {
        untracked(() => this.load());
      }
    });
  }

  protected load(): void {
    void this.service.loadList(NOTIFICATIONS_PANEL_SIZE);
  }

  protected markAll(): void {
    void this.service.markAllRead();
  }

  protected onSelect(notification: AppNotification): void {
    if (this.service.open(notification)) {
      this.open.set(false);
    }
  }
}
