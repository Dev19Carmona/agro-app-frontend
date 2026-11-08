import { Component, computed, input } from '@angular/core';
import { BadgeTone } from './badge.types';

const BASE =
  'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold ' +
  'whitespace-nowrap';

// Los pares texto/fondo cumplen contraste AA en claro y oscuro (los tokens cambian con .app-dark).
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-line bg-sunken text-fg-muted',
  success: 'border-transparent bg-brand-soft text-brand-text',
  warning: 'border-transparent bg-warning/15 text-warning',
  danger: 'border-transparent bg-danger/15 text-danger',
  info: 'border-transparent bg-info/15 text-[color-mix(in_srgb,var(--c-info)_75%,var(--c-fg))]',
};

/**
 * Etiqueta corta de estado. El significado siempre va en el texto; el color solo lo refuerza.
 *
 * Valor por defecto: `tone='neutral'`.
 */
@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(() => `${BASE} ${TONE_CLASSES[this.tone()]}`);
}
