import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { formatCountdown, remainingMs } from '../../utils/countdown';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

/**
 * Cronómetro hasta `expiresAt` (ISO). Un reloj en una señal avanza cada segundo y el cálculo sale de
 * `remainingMs`. Al llegar a 0 emite `expired` una sola vez por cada `expiresAt`.
 *
 * El cronómetro es `role="timer"` (sin `aria-live`): no se anuncia cada segundo. Una región
 * `aria-live="polite"` oculta solo anuncia al faltar 5 minutos, 1 minuto y al vencer.
 */
@Component({
  selector: 'app-order-countdown',
  template: `
    <span
      role="timer"
      aria-label="Tiempo restante para pagar"
      class="font-mono text-3xl font-semibold tabular-nums"
      >{{ text() }}</span
    >
    <span class="sr-only" aria-live="polite">{{ announcement() }}</span>
  `,
  host: { class: 'inline-flex flex-col' },
})
export class OrderCountdown {
  readonly expiresAt = input.required<string>();

  /** El tiempo llegó a 0. El padre decide qué hacer (volver a consultar el pedido). */
  readonly expired = output<void>();

  private readonly now = signal(Date.now());
  private emittedFor: string | null = null;

  protected readonly remaining = computed(() => remainingMs(this.expiresAt(), this.now()));
  protected readonly text = computed(() => formatCountdown(this.remaining()));
  protected readonly announcement = computed(() => {
    const ms = this.remaining();
    if (ms === 0) {
      return 'El tiempo para pagar venció.';
    }
    if (ms <= ONE_MINUTE_MS) {
      return 'Queda menos de un minuto para pagar.';
    }
    if (ms <= FIVE_MINUTES_MS) {
      return 'Quedan menos de cinco minutos para pagar.';
    }
    return '';
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    effect(() => {
      if (this.remaining() === 0 && this.emittedFor !== this.expiresAt()) {
        this.emittedFor = this.expiresAt();
        this.expired.emit();
      }
    });
  }
}
