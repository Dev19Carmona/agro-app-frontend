import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icon.types';
import { ToastService } from './toast-service';
import { ToastTone } from './toast.types';

const TONES: Record<ToastTone, { border: string; icon: string; name: IconName }> = {
  brand: { border: 'border-brand-text', icon: 'text-brand-text', name: 'check' },
  info: { border: 'border-info', icon: 'text-info', name: 'info' },
  warning: { border: 'border-warning', icon: 'text-warning', name: 'alert' },
  danger: { border: 'border-danger', icon: 'text-danger', name: 'alert' },
};

/**
 * Contenedor de los toasts de `ToastService`. Se monta una sola vez en `App`.
 *
 * - Cada toast es `role="status"` con `aria-live="polite"`; `danger` es `role="alert"`.
 * - Se cierra solo a los 6 s; el plazo se pausa con el puntero encima o con el foco dentro.
 * - Tiene botón de cerrar y no roba el foco.
 * - Con `prefers-reduced-motion` no anima.
 */
@Component({
  selector: 'app-toast',
  imports: [Button, Icon, RouterLink],
  styles: `
    @media (prefers-reduced-motion: no-preference) {
      .app-toast-item {
        animation: app-toast-in 180ms ease-out;
      }
    }
    @keyframes app-toast-in {
      from {
        opacity: 0;
        transform: translateY(0.5rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  template: `
    <ul
      class="pointer-events-none fixed right-4 bottom-4 left-4 z-[1100] m-0 flex list-none flex-col items-end gap-3 p-0 sm:left-auto sm:w-96"
    >
      @for (toast of service.toasts(); track toast.id) {
        <li
          class="app-toast-item pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-surface p-4 text-fg shadow-lg"
          [class]="tones[toast.tone].border"
          [attr.role]="toast.tone === 'danger' ? 'alert' : 'status'"
          [attr.aria-live]="toast.tone === 'danger' ? 'assertive' : 'polite'"
          (mouseenter)="service.pause(toast.id)"
          (mouseleave)="service.resume(toast.id)"
          (focusin)="service.pause(toast.id)"
          (focusout)="service.resume(toast.id)"
        >
          <span class="mt-0.5 shrink-0" [class]="tones[toast.tone].icon">
            <app-icon [name]="tones[toast.tone].name" size="md" />
          </span>
          <div class="min-w-0 flex-1 space-y-1">
            <p class="font-semibold wrap-break-word">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="text-sm text-fg-muted wrap-break-word">{{ toast.message }}</p>
            }
            @if (toast.link; as link) {
              <a
                class="text-sm font-semibold text-brand-text underline"
                [routerLink]="link.url"
                (click)="service.dismiss(toast.id)"
                >{{ link.label }}</a
              >
            }
          </div>
          <button
            app-button
            variant="ghost"
            size="sm"
            iconOnly
            ariaLabel="Cerrar aviso"
            (click)="service.dismiss(toast.id)"
          >
            <app-icon name="close" size="sm" />
          </button>
        </li>
      }
    </ul>
  `,
  host: { class: 'contents' },
})
export class Toast {
  protected readonly service = inject(ToastService);
  protected readonly tones = TONES;
}
