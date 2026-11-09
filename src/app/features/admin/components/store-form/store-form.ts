import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import type { StoreDetail } from '../../../../core/catalog';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { UpdateStoreRequest } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';

const LIMITS = { nombre: 120, nit: 30, municipio: 100 } as const;

/**
 * Edición de una tienda por el administrador (`PATCH /catalog/admin/stores/:id`): nombre, NIT y
 * municipio. Solo se envían los campos que cambiaron; sin cambios no se envía nada. Valida en el
 * cliente como ayuda de UX (el backend manda). Si el backend rechaza, muestra su mensaje y conserva
 * lo escrito. Emite `saved` con la tienda que devuelve el backend.
 */
@Component({
  selector: 'app-admin-store-form',
  imports: [FormRoot, FormField, Input, Button, Alert],
  template: `
    <form [formRoot]="f" class="space-y-4">
      @if (error(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      }
      <app-input label="Nombre de la tienda" autocomplete="off" [formField]="f.nombre" />
      <app-input label="NIT" autocomplete="off" [formField]="f.nit" />
      <app-input label="Municipio" autocomplete="off" [formField]="f.municipio" />
      <button app-button type="submit" [disabled]="f().submitting()">
        {{ f().submitting() ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </form>
  `,
  host: { class: 'block' },
})
export class AdminStoreForm {
  private readonly api = inject(AdminApi);

  readonly store = input.required<StoreDetail>();

  readonly saved = output<StoreDetail>();

  protected readonly error = signal<string | null>(null);
  protected readonly model = linkedSignal(() => {
    const { nombre, nit, municipio } = this.store();
    return { nombre, nit, municipio };
  });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe el nombre de la tienda' });
      validate(path.nombre, ({ value }) => check(value(), 'el nombre de la tienda', LIMITS.nombre));
      required(path.nit, { message: 'Escribe el NIT' });
      validate(path.nit, ({ value }) => check(value(), 'el NIT', LIMITS.nit));
      required(path.municipio, { message: 'Escribe el municipio' });
      validate(path.municipio, ({ value }) => check(value(), 'el municipio', LIMITS.municipio));
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async save(): Promise<undefined> {
    this.error.set(null);
    const current = this.store();
    const value = this.model();
    const body: UpdateStoreRequest = {};
    if (value.nombre.trim() !== current.nombre) {
      body.nombre = value.nombre.trim();
    }
    if (value.nit.trim() !== current.nit) {
      body.nit = value.nit.trim();
    }
    if (value.municipio.trim() !== current.municipio) {
      body.municipio = value.municipio.trim();
    }
    if (Object.keys(body).length === 0) {
      this.error.set('Cambia al menos un campo para guardar.');
      return undefined;
    }
    try {
      this.saved.emit(await firstValueFrom(this.api.updateStore(current.id, body)));
    } catch (e) {
      this.error.set((e as ApiError).message);
    }
    return undefined;
  }
}

function check(text: string, label: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { kind: 'required', message: `Escribe ${label}` };
  }
  return trimmed.length > max ? { kind: 'max', message: `Máximo ${max} caracteres` } : null;
}
