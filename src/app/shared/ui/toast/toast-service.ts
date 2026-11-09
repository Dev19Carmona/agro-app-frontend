import { Service, signal } from '@angular/core';
import { TOAST_DURATION_MS, TOAST_MAX_VISIBLE, ToastItem, ToastOptions } from './toast.types';

interface Timer {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

/**
 * Cola de toasts. `show` añade uno y devuelve su `id`; `dismiss` lo quita. Cada toast se cierra
 * solo tras `durationMs`; `pause` y `resume` detienen y reanudan ese plazo (hover o foco dentro).
 * Con más de `TOAST_MAX_VISIBLE` toasts se descartan los más antiguos.
 */
@Service()
export class ToastService {
  private readonly _toasts = signal<readonly ToastItem[]>([]);
  private readonly timers = new Map<number, Timer>();
  private nextId = 1;

  /** Toasts visibles, del más antiguo al más nuevo. */
  readonly toasts = this._toasts.asReadonly();

  show(options: ToastOptions): number {
    const id = this.nextId++;
    const item: ToastItem = {
      id,
      title: options.title,
      message: options.message ?? null,
      tone: options.tone ?? 'info',
      link: options.link ?? null,
    };
    const overflow = this._toasts().length + 1 - TOAST_MAX_VISIBLE;
    if (overflow > 0) {
      this._toasts()
        .slice(0, overflow)
        .forEach((old) => this.dismiss(old.id));
    }
    this._toasts.update((list) => [...list, item]);
    this.timers.set(id, {
      handle: null,
      remaining: options.durationMs ?? TOAST_DURATION_MS,
      startedAt: 0,
    });
    this.resume(id);
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) {
      clearTimeout(timer.handle);
    }
    this.timers.delete(id);
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  /** Cierra todos los toasts. */
  clear(): void {
    [...this.timers.keys()].forEach((id) => this.dismiss(id));
  }

  /** Detiene el cierre automático conservando el tiempo que le queda. */
  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer?.handle) {
      return;
    }
    clearTimeout(timer.handle);
    timer.handle = null;
    timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
  }

  /** Reanuda el cierre automático con el tiempo que quedaba. */
  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle) {
      return;
    }
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remaining);
  }
}
