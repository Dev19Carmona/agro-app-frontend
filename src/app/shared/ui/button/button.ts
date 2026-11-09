import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { ButtonSize, ButtonType, ButtonVariant } from './button.types';

const BASE =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-semibold ' +
  'whitespace-nowrap no-underline transition-colors disabled:pointer-events-none disabled:opacity-50';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line-strong text-fg hover:bg-sunken',
  ghost: 'text-fg hover:bg-sunken',
  danger: 'border border-danger text-danger hover:bg-danger/10',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

const ICON_ONLY_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'size-8 text-sm',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
};

/**
 * Botón con forma de píldora. Se usa como atributo sobre un `<button>` o un `<a>` nativo, así
 * conserva su semántica, foco y teclado.
 *
 * ```html
 * <button app-button variant="primary">Guardar</button>
 * <button app-button iconOnly ariaLabel="Abrir menú"><app-icon name="menu" /></button>
 * ```
 *
 * Valores por defecto: `variant='primary'`, `size='md'`, `type='button'`, `iconOnly=false`.
 * Con `iconOnly` el botón es circular y `ariaLabel` es obligatorio (no hay texto visible).
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  template: '<ng-content />',
  host: {
    '[class]': 'classes()',
    '[attr.type]': 'isButton ? type() : null',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  protected readonly isButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  protected readonly classes = computed(() => {
    const size = this.iconOnly() ? ICON_ONLY_SIZE_CLASSES[this.size()] : SIZE_CLASSES[this.size()];
    return `${BASE} ${VARIANT_CLASSES[this.variant()]} ${size}`;
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        if (this.iconOnly() && !this.ariaLabel()) {
          console.error('app-button con iconOnly necesita ariaLabel: no tiene texto visible.');
        }
      });
    }
  }
}
