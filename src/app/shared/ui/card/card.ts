import { Component, computed, input } from '@angular/core';
import { CardPadding, CardTone } from './card.types';

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const TONE_CLASSES: Record<CardTone, string> = {
  default: 'bg-surface',
  sunken: 'bg-sunken',
};

/**
 * Contenedor con borde y esquinas redondeadas.
 *
 * Valores por defecto: `padding='md'`, `tone='default'`.
 */
@Component({
  selector: 'app-card',
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class Card {
  readonly padding = input<CardPadding>('md');
  readonly tone = input<CardTone>('default');

  protected readonly classes = computed(
    () =>
      `block min-w-0 rounded-xl border border-line text-fg ${TONE_CLASSES[this.tone()]} ${PADDING_CLASSES[this.padding()]}`,
  );
}
