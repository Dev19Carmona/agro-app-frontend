import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { ApiError } from '../../../core/http/api-error';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Input } from '../../../shared/ui/input/input';
import { Select } from '../../../shared/ui/select/select';
import { SelectOption } from '../../../shared/ui/select/select.types';
import { registerErrorMessage } from '../auth-messages';
import { isValidDocument, isValidName, passwordProblems } from './register-validation';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'PRODUCTOR', label: 'Productor' },
  { value: 'PROVEEDOR', label: 'Proveedor' },
];

/**
 * `/auth/registro`. Valida en el cliente (como ayuda de UX; el backend manda) y no envía el
 * formulario si algo falla. Un `PRODUCTOR` queda activo y va a `/auth/login?aviso=registro`; un
 * `PROVEEDOR` queda pendiente de aprobación y ve una pantalla que lo explica, en esta misma ruta.
 */
@Component({
  imports: [FormRoot, FormField, Input, Select, Checkbox, Button, Alert, Card, RouterLink],
  template: `
    <app-card padding="lg" class="space-y-6">
      @if (pendingApproval()) {
        <h1 class="text-3xl">Solicitud enviada</h1>
        <app-alert variant="info" title="Pendiente de aprobación">
          Un administrador revisará tu cuenta de proveedor. Hasta que la apruebe no podrás iniciar
          sesión.
        </app-alert>
        <a app-button routerLink="/catalogo" size="lg" class="w-full">Ir al catálogo</a>
      } @else {
        <h1 class="text-3xl">Crear cuenta</h1>

        @if (error(); as message) {
          <app-alert variant="danger">{{ message }}</app-alert>
        }

        <form [formRoot]="f" class="space-y-4">
          <app-input label="Nombre" autocomplete="name" [formField]="f.nombre" />
          <app-input label="Correo" type="email" autocomplete="email" [formField]="f.email" />
          <app-input
            label="Documento"
            autocomplete="off"
            hint="Entre 5 y 20 letras, números o guiones"
            [formField]="f.documento"
          />
          <app-input
            label="Contraseña"
            type="password"
            autocomplete="new-password"
            hint="Mínimo 10 caracteres, con mayúscula, minúscula y número"
            [formField]="f.password"
          />
          <app-select
            label="Quiero registrarme como"
            placeholder="Elige un rol"
            hint="Un proveedor necesita aprobación antes de iniciar sesión"
            [options]="roles"
            [formField]="f.rol"
          />
          <app-checkbox [formField]="f.aceptaTratamientoDatos">
            Acepto el tratamiento de mis datos personales
          </app-checkbox>

          <button app-button type="submit" size="lg" class="w-full" [disabled]="f().submitting()">
            {{ f().submitting() ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="text-center text-fg-muted">
          ¿Ya tienes cuenta?
          <a routerLink="/auth/login" class="font-semibold text-brand-text">Iniciar sesión</a>
        </p>
      }
    </app-card>
  `,
})
export class Registro {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly roles = ROLE_OPTIONS;
  protected readonly error = signal<string | null>(null);
  /** `true` tras registrar a un `PROVEEDOR`: se muestra la pantalla de solicitud pendiente. */
  protected readonly pendingApproval = signal(false);

  protected readonly model = signal({
    nombre: '',
    email: '',
    documento: '',
    password: '',
    rol: '',
    aceptaTratamientoDatos: false,
  });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe tu nombre' });
      validate(path.nombre, ({ value }) =>
        isValidName(value())
          ? null
          : { kind: 'nombre', message: 'Escribe tu nombre (2 a 120 letras)' },
      );
      required(path.email, { message: 'Escribe tu correo' });
      email(path.email, { message: 'Escribe un correo válido' });
      required(path.documento, { message: 'Escribe tu documento' });
      validate(path.documento, ({ value }) =>
        isValidDocument(value())
          ? null
          : { kind: 'documento', message: 'Documento inválido: 5 a 20 letras, números o guiones' },
      );
      required(path.password, { message: 'Escribe una contraseña' });
      validate(path.password, ({ value, valueOf }) =>
        passwordProblems(value(), valueOf(path.email)).map((message) => ({
          kind: 'password',
          message,
        })),
      );
      required(path.rol, { message: 'Elige un rol' });
      validate(path.aceptaTratamientoDatos, ({ value }) =>
        value() ? null : { kind: 'consent', message: 'Debes aceptar el tratamiento de datos' },
      );
    },
    {
      submission: {
        action: () => this.register(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async register(): Promise<undefined> {
    this.error.set(null);
    const value = this.model();
    const rol = value.rol as 'PRODUCTOR' | 'PROVEEDOR';
    try {
      await firstValueFrom(
        this.api.register({
          email: value.email.trim(),
          password: value.password,
          nombre: value.nombre.trim(),
          documento: value.documento.trim(),
          rol,
          aceptaTratamientoDatos: true,
        }),
      );
    } catch (error) {
      this.error.set(registerErrorMessage(error as ApiError));
      return;
    }
    if (rol === 'PROVEEDOR') {
      this.pendingApproval.set(true);
      return;
    }
    await this.router.navigate(['/auth/login'], { queryParams: { aviso: 'registro' } });
  }
}
