import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { MyVariant } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import {
  LIMITS,
  validateOffer,
  validatePrice,
  validateRequiredText,
  validateStock,
} from '../../utils/product-validation';

const EMPTY = {
  presentacion: '',
  unidad: '',
  precio: null as number | null,
  precioOferta: null as number | null,
  stock: null as number | null,
};

/**
 * Alta de una presentación de un producto (`POST /catalog/products/:id/variants`): presentación,
 * unidad, precio, precio de oferta opcional y stock inicial. Con `precioOferta` mayor o igual al
 * precio no se envía. Al crearla emite `created` con la presentación del backend y vacía el
 * formulario; si el backend rechaza, muestra su mensaje y conserva lo escrito.
 */
@Component({
  selector: 'app-variant-create-form',
  imports: [FormRoot, FormField, Input, Button, Alert],
  template: `
    <form [formRoot]="f" class="space-y-4">
      @if (error(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      } @else if (justCreated()) {
        <app-alert variant="success">Presentación agregada.</app-alert>
      }
      <div class="grid gap-4 sm:grid-cols-2">
        <app-input label="Presentación" autocomplete="off" [formField]="f.presentacion" />
        <app-input
          label="Unidad"
          autocomplete="off"
          hint="Por ejemplo kg, L o unidad"
          [formField]="f.unidad"
        />
        <app-input label="Precio (COP)" type="number" [step]="1" [formField]="f.precio" />
        <app-input
          label="Precio de oferta (COP)"
          type="number"
          hint="Opcional. Debe ser menor que el precio."
          [step]="1"
          [formField]="f.precioOferta"
        />
        <app-input label="Stock inicial" type="number" [step]="1" [formField]="f.stock" />
      </div>
      <button app-button type="submit" [disabled]="f().submitting()">
        {{ f().submitting() ? 'Agregando…' : 'Agregar presentación' }}
      </button>
    </form>
  `,
  host: { class: 'block' },
})
export class VariantCreateForm {
  private readonly api = inject(ProveedorApi);

  readonly productId = input.required<string>();
  readonly created = output<MyVariant>();

  protected readonly error = signal<string | null>(null);
  protected readonly justCreated = signal(false);
  protected readonly model = signal({ ...EMPTY });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.presentacion, { message: 'Escribe la presentación' });
      validate(path.presentacion, ({ value }) =>
        message(validateRequiredText(value(), 'la presentación', LIMITS.presentacion)),
      );
      required(path.unidad, { message: 'Escribe la unidad' });
      validate(path.unidad, ({ value }) =>
        message(validateRequiredText(value(), 'la unidad', LIMITS.unidad)),
      );
      validate(path.precio, ({ value }) => message(validatePrice(asNumber(value()))));
      validate(path.precioOferta, ({ value, valueOf }) =>
        message(validateOffer(asNumber(value()), asNumber(valueOf(path.precio)))),
      );
      validate(path.stock, ({ value }) => message(validateStock(asNumber(value()))));
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
    this.justCreated.set(false);
    const value = this.model();
    if (value.precio === null || value.stock === null) {
      return undefined;
    }
    try {
      const variant = await firstValueFrom(
        this.api.createVariant(this.productId(), {
          presentacion: value.presentacion.trim(),
          unidad: value.unidad.trim(),
          precio: value.precio,
          ...(value.precioOferta !== null ? { precioOferta: value.precioOferta } : {}),
          stock: value.stock,
        }),
      );
      this.model.set({ ...EMPTY });
      this.f().reset();
      this.justCreated.set(true);
      this.created.emit(variant);
    } catch (error) {
      this.error.set((error as ApiError).message);
    }
    return undefined;
  }
}

function message(text: string | null) {
  return text ? { kind: 'texto', message: text } : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}
