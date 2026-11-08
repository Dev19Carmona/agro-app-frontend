import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { safeReturnUrl } from '../../../core/auth/safe-return-url';
import { SessionService } from '../../../core/auth/session';
import { ApiError } from '../../../core/http/api-error';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { Input } from '../../../shared/ui/input/input';
import { loginErrorMessage, loginNotice } from '../auth-messages';

/**
 * `/auth/login`. Pide correo y contraseña (solo exige que no estén vacíos: la política real la
 * aplica el backend), inicia la sesión y navega a `returnUrl` si es una ruta interna, o a
 * `/catalogo`. `?aviso=registro|clave|sesion` muestra un mensaje; otros valores se ignoran.
 */
@Component({
  imports: [FormRoot, FormField, Input, Button, Alert, Card, RouterLink],
  template: `
    <app-card padding="lg" class="space-y-6">
      <h1 class="text-3xl">Iniciar sesión</h1>

      @if (notice(); as notice) {
        <app-alert [variant]="notice.variant">{{ notice.message }}</app-alert>
      }
      @if (error(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      }

      <form [formRoot]="f" class="space-y-4">
        <app-input label="Correo" type="email" autocomplete="email" [formField]="f.email" />
        <app-input
          label="Contraseña"
          type="password"
          autocomplete="current-password"
          [formField]="f.password"
        />
        <button app-button type="submit" size="lg" class="w-full" [disabled]="f().submitting()">
          {{ f().submitting() ? 'Entrando…' : 'Iniciar sesión' }}
        </button>
      </form>

      <p class="text-center text-fg-muted">
        ¿No tienes cuenta?
        <a routerLink="/auth/registro" class="font-semibold text-brand-text">Crear cuenta</a>
      </p>
    </app-card>
  `,
})
export class Login {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly notice = computed(() => loginNotice(this.query().get('aviso')));
  protected readonly error = signal<string | null>(null);

  protected readonly model = signal({ email: '', password: '' });
  protected readonly f = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Escribe tu correo' });
      required(path.password, { message: 'Escribe tu contraseña' });
    },
    {
      submission: {
        action: () => this.login(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async login(): Promise<undefined> {
    this.error.set(null);
    const { email, password } = this.model();
    try {
      const response = await firstValueFrom(this.api.login({ email: email.trim(), password }));
      this.session.start(response, response.user);
    } catch (error) {
      this.error.set(loginErrorMessage(error as ApiError));
      return;
    }
    await this.router.navigateByUrl(safeReturnUrl(this.query().get('returnUrl'), this.router));
  }
}
