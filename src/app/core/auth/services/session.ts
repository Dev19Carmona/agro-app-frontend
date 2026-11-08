import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { AuthUser, REFRESH_TOKEN_STORAGE_KEY, SessionRole, SessionStatus } from './auth.types';

/**
 * Estado de la sesión. El access token vive solo en memoria; el refresh token se guarda en
 * `localStorage` (`agro:refresh-token`). Este servicio no hace peticiones: las hace `AuthApi`.
 */
@Service()
export class SessionService {
  private readonly win = inject(DOCUMENT).defaultView;

  private readonly _status = signal<SessionStatus>('restoring');
  private readonly _user = signal<AuthUser | null>(null);
  private accessToken: string | null = null;

  /** Estado de la sesión: `restoring` hasta que termina la restauración inicial. */
  readonly status = this._status.asReadonly();

  /** Usuario autenticado, o `null`. */
  readonly user = this._user.asReadonly();

  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /** Rol efectivo; `VISITANTE` si no hay sesión. */
  readonly role = computed<SessionRole>(() => this._user()?.rol ?? 'VISITANTE');

  /** Access token en memoria, o `null`. */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Refresh token guardado, o `null` si no hay o el almacenamiento falla. */
  getRefreshToken(): string | null {
    try {
      return this.win?.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  /** Inicia la sesión: guarda ambos tokens y el usuario. */
  start(tokens: { accessToken: string; refreshToken: string }, user: AuthUser): void {
    this.accessToken = tokens.accessToken;
    this.setRefreshToken(tokens.refreshToken);
    this._user.set(user);
    this._status.set('authenticated');
  }

  /** Guarda tokens nuevos tras un refresh, sin tocar al usuario. */
  updateTokens(tokens: { accessToken: string; refreshToken: string }): void {
    this.accessToken = tokens.accessToken;
    this.setRefreshToken(tokens.refreshToken);
  }

  /** Actualiza los datos del usuario (p. ej. tras `GET /auth/me`). */
  setUser(user: AuthUser): void {
    this._user.set(user);
  }

  /** Cierra la sesión local: borra tokens y usuario. */
  clear(): void {
    this.accessToken = null;
    this.removeRefreshToken();
    this._user.set(null);
    this._status.set('anonymous');
  }

  /**
   * Termina la restauración inicial sin sesión, conservando el refresh token
   * (p. ej. el backend estaba caído).
   */
  markAnonymous(): void {
    this.accessToken = null;
    this._user.set(null);
    this._status.set('anonymous');
  }

  private setRefreshToken(token: string): void {
    try {
      this.win?.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } catch {
      // Sin almacenamiento: la sesión dura hasta recargar.
    }
  }

  private removeRefreshToken(): void {
    try {
      this.win?.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // Nada que borrar.
    }
  }
}
