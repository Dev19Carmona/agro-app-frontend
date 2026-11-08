import { Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icon.types';
import { AlertVariant } from './alert.types';

const BASE = 'flex items-start gap-3 rounded-lg border bg-surface p-4 text-fg';

// El texto siempre es `text-fg` (contraste AA); el color solo va en el borde y el icono.
const VARIANTS: Record<AlertVariant, { border: string; icon: string; name: IconName }> = {
  danger: { border: 'border-danger', icon: 'text-danger', name: 'alert' },
  info: { border: 'border-info', icon: 'text-info', name: 'info' },
  success: { border: 'border-brand-text', icon: 'text-brand-text', name: 'check' },
};

/**
 * Aviso en línea con icono, título opcional y contenido proyectado. `danger` lleva
 * `role="alert"` (se anuncia al aparecer); `info` y `success` llevan `role="status"`.
 *
 * Valores por defecto: `variant='info'`, `title=null`.
 */
@Component({
  selector: 'app-alert',
  imports: [Icon],
  template: `
    <span class="mt-0.5 shrink-0" [class]="config().icon"
      ><app-icon [name]="config().name" size="md"
    /></span>
    <div class="min-w-0 space-y-1">
      @if (title()) {
        <p class="font-semibold">{{ title() }}</p>
      }
      <div class="wrap-break-word"><ng-content /></div>
    </div>
  `,
  host: {
    '[class]': 'classes()',
    '[attr.role]': "variant() === 'danger' ? 'alert' : 'status'",
  },
})
export class Alert {
  readonly variant = input<AlertVariant>('info');
  readonly title = input<string | null>(null);

  protected readonly config = computed(() => VARIANTS[this.variant()]);
  protected readonly classes = computed(() => `${BASE} ${this.config().border}`);
}
