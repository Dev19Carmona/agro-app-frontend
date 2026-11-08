import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../core/auth/auth-api';
import { Profile, UserStatus } from '../../core/auth/auth.types';
import { LogoutService } from '../../core/auth/logout';
import { SessionService } from '../../core/auth/session';
import { ApiError } from '../../core/http/api-error';
import { SESSION_ROLE_LABELS } from '../../core/navigation/nav.config';
import { Alert } from '../../shared/ui/alert/alert';
import { Badge } from '../../shared/ui/badge/badge';
import { BadgeTone } from '../../shared/ui/badge/badge.types';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Input } from '../../shared/ui/input/input';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { changePasswordErrorMessage } from '../auth/auth-messages';
import { passwordProblems } from '../auth/registro/register-validation';

const STATUS: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  PENDING_APPROVAL: { label: 'Pendiente de aprobación', tone: 'warning' },
  REJECTED: { label: 'Rechazada', tone: 'danger' },
  DISABLED: { label: 'Deshabilitada', tone: 'neutral' },
};

/**
 * `/cuenta`: datos del perfil (`GET /auth/me`), cambio de contraseña y cierre de sesión.
 * Cambiar la contraseña cierra todas las sesiones en el backend, así que aquí se borra la
 * sesión local y se va a `/auth/login?aviso=clave`.
 */
@Component({
  imports: [PageHeader, Card, Badge, Alert, Button, Input, FormRoot, FormField],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Mi cuenta"
        description="Tus datos, tu contraseña y el cierre de sesión."
      >
        <button actions app-button variant="secondary" (click)="logout()">Cerrar sesión</button>
      </app-page-header>

      <app-card role="region" aria-labelledby="perfil-titulo" class="space-y-4">
        <h2 id="perfil-titulo" class="text-xl">Perfil</h2>
        @if (profile(); as p) {
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-fg-muted">Nombre</dt>
              <dd class="wrap-break-word">{{ p.nombre }}</dd>
            </div>
            <div>
              <dt class="text-sm text-fg-muted">Correo</dt>
              <dd class="wrap-break-word">{{ p.email }}</dd>
            </div>
            <div>
              <dt class="text-sm text-fg-muted">Rol</dt>
              <dd>{{ roleLabels[p.rol] }}</dd>
            </div>
            <div>
              <dt class="text-sm text-fg-muted">Estado</dt>
              <dd>
                <app-badge [tone]="statusOf(p).tone">{{ statusOf(p).label }}</app-badge>
              </dd>
            </div>
            @if (p.storeId) {
              <div>
                <dt class="text-sm text-fg-muted">Tienda</dt>
                <dd class="wrap-break-word">
                  <code>{{ p.storeId }}</code>
                </dd>
              </div>
            }
          </dl>
        } @else if (profileError(); as message) {
          <app-alert variant="danger">{{ message }}</app-alert>
          <button app-button variant="secondary" (click)="loadProfile()">Reintentar</button>
        } @else {
          <p class="text-fg-muted" role="status">Cargando tus datos…</p>
        }
      </app-card>

      <app-card role="region" aria-labelledby="clave-titulo" class="space-y-4">
        <h2 id="clave-titulo" class="text-xl">Cambiar contraseña</h2>
        <p class="text-fg-muted">
          Al cambiarla se cerrarán todas tus sesiones y tendrás que iniciar sesión de nuevo.
        </p>

        @if (passwordError(); as message) {
          <app-alert variant="danger">{{ message }}</app-alert>
        }

        <form [formRoot]="f" class="max-w-md space-y-4">
          <app-input
            label="Contraseña actual"
            type="password"
            autocomplete="current-password"
            [formField]="f.currentPassword"
          />
          <app-input
            label="Contraseña nueva"
            type="password"
            autocomplete="new-password"
            hint="Mínimo 10 caracteres, con mayúscula, minúscula y número"
            [formField]="f.newPassword"
          />
          <button app-button type="submit" [disabled]="f().submitting()">
            {{ f().submitting() ? 'Cambiando…' : 'Cambiar contraseña' }}
          </button>
        </form>
      </app-card>
    </div>
  `,
})
export class Cuenta {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly logoutService = inject(LogoutService);

  protected readonly roleLabels = SESSION_ROLE_LABELS;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly model = signal({ currentPassword: '', newPassword: '' });
  protected readonly f = form(
    this.model,
    (path) => {
      required(path.currentPassword, { message: 'Escribe tu contraseña actual' });
      required(path.newPassword, { message: 'Escribe la contraseña nueva' });
      validate(path.newPassword, ({ value }) =>
        passwordProblems(value(), this.session.user()?.email ?? '').map((message) => ({
          kind: 'password',
          message,
        })),
      );
    },
    {
      submission: {
        action: () => this.changePassword(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  constructor() {
    void this.loadProfile();
  }

  protected statusOf(profile: Profile) {
    return STATUS[profile.status];
  }

  protected async loadProfile(): Promise<void> {
    this.profileError.set(null);
    try {
      const profile = await firstValueFrom(this.api.me());
      this.profile.set(profile);
      this.session.setUser(profile);
    } catch (error) {
      this.profileError.set((error as ApiError).message);
    }
  }

  protected logout(): void {
    void this.logoutService.logout();
  }

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async changePassword(): Promise<undefined> {
    this.passwordError.set(null);
    const { currentPassword, newPassword } = this.model();
    try {
      await firstValueFrom(this.api.changePassword({ currentPassword, newPassword }));
    } catch (error) {
      // La sesión se conserva: con la contraseña actual incorrecta el usuario puede reintentar.
      this.passwordError.set(changePasswordErrorMessage(error as ApiError));
      return;
    }
    // El backend ya cerró todas las sesiones: los tokens locales dejaron de servir.
    this.session.clear();
    await this.router.navigate(['/auth/login'], { queryParams: { aviso: 'clave' } });
  }
}
