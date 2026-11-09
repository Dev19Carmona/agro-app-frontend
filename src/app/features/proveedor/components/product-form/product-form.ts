import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { PublicCategory } from '../../../../core/catalog';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { FichaRow, MyProduct, ProductView } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import { fichaToRows, rowsToFicha, validateFicha } from '../../utils/ficha-tecnica';
import { LIMITS, validateRequiredText } from '../../utils/product-validation';
import { FichaTecnicaEditor } from '../ficha-tecnica-editor/ficha-tecnica-editor';

/**
 * Formulario de producto, compartido por «Nuevo producto» y «Editar producto».
 *
 * - Sin `product`: crea (`POST /catalog/products`) y emite `saved` con el producto creado.
 * - Con `product`: edita (`PATCH /catalog/products/:id`), muestra la casilla «Activo» y emite
 *   `saved` con el producto guardado.
 *
 * Valida en el cliente (nombre, marca, categoría y ficha técnica) como ayuda de UX: si algo falla
 * no envía. Un error del backend (`400`, `409`, sin conexión) se muestra arriba y conserva lo
 * escrito.
 */
@Component({
  selector: 'app-product-form',
  imports: [FormRoot, FormField, Input, Select, Checkbox, Button, Alert, FichaTecnicaEditor],
  template: `
    <form [formRoot]="f" class="space-y-6">
      @if (error(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      }
      <app-input label="Nombre del producto" autocomplete="off" [formField]="f.nombre" />
      <app-input label="Marca" autocomplete="off" [formField]="f.marca" />
      <app-select
        label="Categoría"
        placeholder="Elige una categoría"
        [options]="categoryOptions()"
        [formField]="f.categoryId"
      />
      <app-checkbox
        hint="Marca esta opción si el precio se acuerda con el comprador: no se podrá comprar directamente."
        [formField]="f.requiresQuote"
      >
        Precio a cotizar
      </app-checkbox>
      @if (product()) {
        <app-checkbox
          hint="Un producto inactivo deja de aparecer en el catálogo. Puedes reactivarlo cuando quieras."
          [formField]="f.activo"
        >
          Activo
        </app-checkbox>
      }

      <app-ficha-tecnica-editor [(rows)]="fichaRows" [issues]="fichaIssues()" />

      <button app-button type="submit" size="lg" [disabled]="f().submitting()">
        {{ f().submitting() ? 'Guardando…' : submitLabel() }}
      </button>
    </form>
  `,
  host: { class: 'block' },
})
export class ProductForm {
  private readonly api = inject(ProveedorApi);

  readonly categories = input.required<PublicCategory[]>();
  /** El producto que se edita; sin él, el formulario crea uno nuevo. */
  readonly product = input<MyProduct | ProductView | null>(null);

  readonly saved = output<ProductView>();

  protected readonly error = signal<string | null>(null);
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.nombre })),
  );
  protected readonly submitLabel = computed(() =>
    this.product() ? 'Guardar cambios' : 'Crear producto',
  );

  protected readonly fichaRows = signal<FichaRow[]>([]);
  private readonly fichaTried = signal(false);
  protected readonly fichaIssues = computed(() =>
    this.fichaTried() ? validateFicha(this.fichaRows()) : [],
  );

  protected readonly model = signal({
    nombre: '',
    marca: '',
    categoryId: '',
    requiresQuote: false,
    activo: true,
  });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe el nombre del producto' });
      validate(path.nombre, ({ value }) =>
        message(validateRequiredText(value(), 'el nombre del producto', LIMITS.productoNombre)),
      );
      required(path.marca, { message: 'Escribe la marca' });
      validate(path.marca, ({ value }) =>
        message(validateRequiredText(value(), 'la marca', LIMITS.productoMarca)),
      );
      required(path.categoryId, { message: 'Elige una categoría' });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: (field) => {
          this.fichaTried.set(true);
          field().focusBoundControl();
        },
      },
    },
  );

  /** Id del producto ya volcado al formulario: solo se recarga si cambia a otro producto. */
  private loadedId: string | null = null;

  constructor() {
    effect(() => {
      const product = this.product();
      if (!product || product.id === this.loadedId) {
        return;
      }
      this.loadedId = product.id;
      untracked(() => {
        this.model.set({
          nombre: product.nombre,
          marca: product.marca,
          categoryId: product.categoryId,
          requiresQuote: product.requiresQuote,
          activo: product.activo,
        });
        this.fichaRows.set(fichaToRows(product.fichaTecnica));
      });
    });
  }

  /** Se ejecuta solo con los campos válidos; `submitting` vuelve a `false` al terminar. */
  private async save(): Promise<undefined> {
    this.error.set(null);
    this.fichaTried.set(true);
    if (validateFicha(this.fichaRows()).length > 0) {
      return undefined;
    }
    const value = this.model();
    const body = {
      categoryId: value.categoryId,
      nombre: value.nombre.trim(),
      marca: value.marca.trim(),
      fichaTecnica: rowsToFicha(this.fichaRows()),
      requiresQuote: value.requiresQuote,
    };
    const current = this.product();
    try {
      const saved = await firstValueFrom(
        current
          ? this.api.updateProduct(current.id, { ...body, activo: value.activo })
          : this.api.createProduct(body),
      );
      this.saved.emit(saved);
    } catch (error) {
      this.error.set((error as ApiError).message);
    }
    return undefined;
  }
}

function message(text: string | null) {
  return text ? { kind: 'texto', message: text } : null;
}
