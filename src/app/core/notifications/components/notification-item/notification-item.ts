import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { AppNotification } from '../../models/notifications.types';
import {
  NOTIFICATION_TONE_CLASSES,
  formatNotificationDate,
  notificationPresentation,
} from '../../utils/notification-presentation';

/**
 * Fila de un aviso: icono según la plantilla, título, mensaje, fecha y, si no está leído, un punto
 * con el texto oculto «Sin leer» y el título en negrita. Es un botón: al pulsarlo emite `select`.
 *
 * `titulo` y `mensaje` se muestran como texto y con `break-words`, para que un id de 24 caracteres
 * no produzca scroll horizontal a 360 px.
 */
@Component({
  selector: 'app-notification-item',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="flex w-full cursor-pointer items-start gap-3 rounded-md p-3 text-left text-fg transition-colors hover:bg-sunken"
      (click)="select.emit(notification())"
    >
      <span class="mt-0.5 shrink-0" [class]="toneClass()">
        <app-icon [name]="presentation().icon" size="md" />
      </span>
      <span class="min-w-0 flex-1 space-y-1">
        <span class="flex items-start justify-between gap-2">
          <span class="wrap-break-word" [class.font-semibold]="unread()">{{
            notification().titulo
          }}</span>
          @if (unread()) {
            <span
              aria-hidden="true"
              class="mt-1.5 size-2.5 shrink-0 rounded-pill bg-brand-text"
            ></span>
            <span class="sr-only">Sin leer</span>
          }
        </span>
        <span class="block text-sm text-fg-muted wrap-break-word">{{
          notification().mensaje
        }}</span>
        <span class="block text-xs text-fg-muted">{{ date() }}</span>
      </span>
    </button>
  `,
  host: { class: 'block' },
})
export class NotificationItem {
  readonly notification = input.required<AppNotification>();

  /** El usuario pulsó el aviso. */
  readonly select = output<AppNotification>();

  protected readonly unread = computed(() => this.notification().readAt === null);
  protected readonly presentation = computed(() =>
    notificationPresentation(this.notification().plantilla),
  );
  protected readonly toneClass = computed(
    () => NOTIFICATION_TONE_CLASSES[this.presentation().tone],
  );
  protected readonly date = computed(() => formatNotificationDate(this.notification().sentAt));
}
