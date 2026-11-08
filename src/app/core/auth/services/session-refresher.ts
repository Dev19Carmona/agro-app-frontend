import { DOCUMENT, Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../http';
import { AuthApi } from './auth-api';
import { SessionService } from './session';

const REFRESH_LOCK_NAME = 'agro:refresh-token';

/** Estados con los que el backend declara inválido el refresh token. */
const INVALID_TOKEN_STATUSES: readonly number[] = [400, 401, 403];

/** `true` si el refresh falló porque el token ya no sirve (y no por red o por el servidor). */
export function isInvalidRefresh(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    INVALID_TOKEN_STATUSES.includes((error as ApiError).status)
  );
}

/**
 * Renueva la sesión con el refresh token. El refresh rota en cada uso y reutilizar un token ya
 * usado revoca toda la sesión, así que:
 * - dentro de una pestaña, todas las llamadas simultáneas comparten un único refresh;
 * - entre pestañas, se serializa con `navigator.locks` y el token se relee del almacenamiento
 *   dentro del bloqueo (si no hay `navigator.locks`, se ejecuta sin bloqueo).
 */
@Service()
export class SessionRefresher {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly win = inject(DOCUMENT).defaultView;

  private inflight: Promise<void> | null = null;

  /** Renueva tokens y usuario. Rechaza con `ApiError`; no toca la sesión si falla. */
  refresh(): Promise<void> {
    this.inflight ??= this.withLock(() => this.rotate()).finally(() => (this.inflight = null));
    return this.inflight;
  }

  /**
   * Restaura la sesión al arrancar. Nunca rechaza: sin token o ante cualquier fallo queda
   * anónima. Solo se borra el refresh token si el backend lo declara inválido; un error de red
   * lo conserva para el siguiente intento.
   */
  async restore(): Promise<void> {
    if (!this.session.getRefreshToken()) {
      this.session.markAnonymous();
      return;
    }
    try {
      await this.refresh();
    } catch (error) {
      if (isInvalidRefresh(error)) {
        this.session.clear();
      } else {
        this.session.markAnonymous();
      }
    }
  }

  private async rotate(): Promise<void> {
    // Se lee aquí, ya dentro del bloqueo: otra pestaña pudo rotarlo mientras esperábamos.
    const refreshToken = this.session.getRefreshToken();
    if (!refreshToken) {
      throw { status: 401, message: 'No hay sesión' } satisfies ApiError;
    }
    const response = await firstValueFrom(this.api.refresh(refreshToken));
    this.session.start(response, response.user);
  }

  private withLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = this.win?.navigator?.locks;
    return locks ? locks.request(REFRESH_LOCK_NAME, task) : task();
  }
}
