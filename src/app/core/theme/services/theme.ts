import { DestroyRef, DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';
import { DARK_CLASS, EffectiveTheme, THEME_STORAGE_KEY, ThemeMode } from '../models/theme.types';

const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/**
 * Gestiona el tema claro/oscuro. La preferencia vive en `mode`; el tema aplicado sale de
 * `effective` y se refleja en la clase `app-dark` de `<html>`.
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly win = this.document.defaultView;
  private readonly query = this.win?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  private readonly _mode = signal<ThemeMode>(this.readStored() ?? 'system');
  private readonly systemDark = signal(this.query?.matches ?? false);

  /** Preferencia elegida (`system` por defecto). */
  readonly mode = this._mode.asReadonly();

  /** Tema aplicado: resuelve `system` con `prefers-color-scheme`. */
  readonly effective = computed<EffectiveTheme>(() => {
    const mode = this._mode();
    if (mode === 'system') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    if (this.query) {
      const onChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
      this.query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => this.query?.removeEventListener('change', onChange));
    }

    effect(() => {
      this.document.documentElement.classList.toggle(DARK_CLASS, this.effective() === 'dark');
    });
  }

  /** Cambia la preferencia y la guarda. Un valor no válido se ignora. */
  setMode(mode: ThemeMode): void {
    if (!isThemeMode(mode)) {
      return;
    }
    this._mode.set(mode);
    try {
      this.win?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Sin almacenamiento (modo privado, datos bloqueados): la preferencia dura la sesión.
    }
  }

  private readStored(): ThemeMode | null {
    try {
      const value = this.win?.localStorage.getItem(THEME_STORAGE_KEY);
      return isThemeMode(value) ? value : null;
    } catch {
      return null;
    }
  }
}
