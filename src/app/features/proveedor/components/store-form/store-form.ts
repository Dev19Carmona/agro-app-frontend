import { Component, inject, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { MyStore } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import { LIMITS, validateRequiredText } from '../../utils/product-validation';

/**
 * Formulario de creación de la tienda (`POST /catalog/stores`): `nombre`, `nit` y `municipio`.
 * Valida en el cliente como ayuda de UX (el backend manda). Si el backend rechaza (`409`: NIT
 * repetido o tienda ya creada), muestra su mensaje y conserva lo escrito. Emite `created` con la
 * tienda creada.
 */
@Component({
  selector: 'app-store-form',
  imports: [FormRoot, FormField, Input, Button, Alert],
  template: `
    <form [formRoot]="f" class="space-y-4">
      @if (error(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      }
      <app-input label="Nombre de la tienda" autocomplete="organization" [formField]="f.nombre" />
      <app-input
        label="NIT"
        autocomplete="off"
        hint="Número de identificación tributaria de tu negocio"
        [formField]="f.nit"
      />
      <app-input label="Municipio" autocomplete="address-level2" [formField]="f.municipio" />
      <button app-button type="submit" size="lg" [disabled]="f().submitting()">
        {{ f().submitting() ? 'Creando tienda…' : 'Crear tienda' }}
      </button>
    </form>
  `,
  host: { class: 'block' },
})
export class StoreForm {
  private readonly api = inject(ProveedorApi);

  readonly created = output<MyStore>();

  protected readonly error = signal<string | null>(null);
  protected readonly model = signal({ nombre: '', nit: '', municipio: '' });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe el nombre de la tienda' });
      validate(path.nombre, ({ value }) =>
        message(validateRequiredText(value(), 'el nombre de la tienda', LIMITS.tiendaNombre)),
      );
      required(path.nit, { message: 'Escribe el NIT' });
      validate(path.nit, ({ value }) =>
        message(validateRequiredText(value(), 'el NIT', LIMITS.tiendaNit)),
      );
      required(path.municipio, { message: 'Escribe el municipio' });
      validate(path.municipio, ({ value }) =>
        message(validateRequiredText(value(), 'el municipio', LIMITS.tiendaMunicipio)),
      );
    },
    {
      submission: {
        action: () => this.create(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async create(): Promise<undefined> {
    this.error.set(null);
    const value = this.model();
    try {
      const store = await firstValueFrom(
        this.api.createStore({
          nombre: value.nombre.trim(),
          nit: value.nit.trim(),
          municipio: value.municipio.trim(),
        }),
      );
      this.created.emit(store);
    } catch (error) {
      this.error.set((error as ApiError).message);
    }
    return undefined;
  }
}

function message(text: string | null) {
  return text ? { kind: 'texto', message: text } : null;
}
