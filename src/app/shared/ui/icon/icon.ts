import { Component, computed, input } from '@angular/core';
import { ICON_PATHS } from './icon-paths';
import { IconName, IconSize } from './icon.types';

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

/**
 * Icono SVG inline. Por defecto es decorativo (`aria-hidden`). Si el icono es la única
 * información, se le pasa `label` y se expone como imagen con ese texto.
 *
 * Valores por defecto: `size='md'`, `label=null`.
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      [class]="sizeClass()"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  host: {
    class: 'inline-flex shrink-0',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label()',
  },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly label = input<string | null>(null);

  protected readonly paths = computed(() => ICON_PATHS[this.name()]);
  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
}
