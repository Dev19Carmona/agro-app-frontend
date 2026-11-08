import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icon.types';

/**
 * Estado vacío: icono, título, descripción y acciones opcionales (atributo `actions`).
 * Un estado vacío invita a actuar: el título dice qué falta y la acción cómo resolverlo.
 *
 * Valores por defecto: `icon='inbox'`, `description=null`, `headingLevel=2`.
 */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center gap-4 text-center">
      <span
        class="inline-flex size-14 items-center justify-center rounded-pill bg-sunken text-brand-text"
      >
        <app-icon [name]="icon()" size="lg" />
      </span>
      <div class="max-w-md space-y-1">
        <p role="heading" [attr.aria-level]="headingLevel()" class="font-serif text-xl">
          {{ title() }}
        </p>
        @if (description()) {
          <p class="text-fg-muted">{{ description() }}</p>
        }
      </div>
      <div class="flex flex-wrap justify-center gap-2 empty:hidden">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
  host: {
    class: 'block rounded-xl border border-dashed border-line-strong px-4 py-10 sm:py-14',
  },
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<IconName>('inbox');
  readonly headingLevel = input<2 | 3 | 4>(2);
}
