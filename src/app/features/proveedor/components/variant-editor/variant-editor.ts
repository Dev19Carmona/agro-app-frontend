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
import { formatCop } from '../../../../core/catalog';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { Input } from '../../../../shared/ui/input/input';
import { MyVariant, UpdateVariantRequest } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';
import {
  LIMITS,
  validateOffer,
  validatePrice,
  validateRequiredText,
  validateStock,
} from '../../utils/product-validation';
import { StockSummary } from '../stock-summary/stock-summary';

/**
 * Una presentación del producto: su resumen (precio vigente, estado, stock total, reservado y
 * disponible) y dos formularios independientes, porque son endpoints distintos:
 *
 * - **Datos** (`PATCH /catalog/variants/:id`): presentación, unidad, precio, precio de oferta
 *   (vacío la quita: se envía `precioOferta: null`) y la casilla «Activo».
 * - **Stock** (`PATCH /catalog/variants/:id/stock`): valor absoluto, mínimo lo reservado. Si el
 *   backend responde `409`, se muestra su mensaje.
 *
 * Cada guardado emite `changed` con la presentación que devuelve el backend, para que quien la
 * lista actualice solo esa fila.
 */
@Component({
  selector: 'app-variant-editor',
  imports: [FormRoot, FormField, Input, Checkbox, Button, Alert, Badge, Card, StockSummary],
  template: `
    <app-card padding="lg" class="space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <h3 class="text-xl wrap-break-word">
            {{ variant().presentacion }} · {{ variant().unidad }}
          </h3>
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="font-semibold">{{ cop(variant().precioVigente) }}</span>
            @if (variant().precioOferta !== undefined) {
              <span class="text-sm text-fg-muted">
                <span class="sr-only">Precio anterior: </span><s>{{ cop(variant().precio) }}</s>
              </span>
            }
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <app-badge [tone]="variant().activo ? 'success' : 'neutral'">{{
            variant().activo ? 'Activa' : 'Inactiva'
          }}</app-badge>
          @if (variant().precioOferta !== undefined) {
            <app-badge tone="info">En oferta</app-badge>
          }
        </div>
      </header>

      <app-stock-summary
        [stock]="variant().stock"
        [reservado]="variant().stockReservado"
        [disponible]="variant().disponible"
      />

      <div class="grid gap-8 lg:grid-cols-2">
        <form [formRoot]="data" class="space-y-4">
          <h4 class="text-lg font-semibold">Datos</h4>
          @if (dataError(); as message) {
            <app-alert variant="danger">{{ message }}</app-alert>
          } @else if (dataSaved()) {
            <app-alert variant="success">Datos guardados.</app-alert>
          }
          <app-input label="Presentación" autocomplete="off" [formField]="data.presentacion" />
          <app-input label="Unidad" autocomplete="off" [formField]="data.unidad" />
          <app-input
            label="Precio (COP)"
            type="number"
            [step]="1"
            [formField]="data.precio"
          />
          <app-input
            label="Precio de oferta (COP)"
            type="number"
            hint="Opcional. Debe ser menor que el precio. Déjalo vacío para quitar la oferta."
            [step]="1"
            [formField]="data.precioOferta"
          />
          @if (data.precioOferta().value() !== null) {
            <button app-button type="button" variant="ghost" size="sm" (click)="clearOffer()">
              Quitar oferta
            </button>
          }
          <app-checkbox [formField]="data.activo">Activa</app-checkbox>
          <button app-button type="submit" [disabled]="data().submitting()">
            {{ data().submitting() ? 'Guardando…' : 'Guardar datos' }}
          </button>
        </form>

        <form [formRoot]="stockForm" class="space-y-4">
          <h4 class="text-lg font-semibold">Stock</h4>
          @if (stockError(); as message) {
            <app-alert variant="danger">{{ message }}</app-alert>
          } @else if (stockSaved()) {
            <app-alert variant="success">Stock guardado.</app-alert>
          }
          <app-input
            label="Stock total"
            type="number"
            [step]="1"
            [hint]="'Valor absoluto. No puede ser menor que lo reservado (' + variant().stockReservado + ').'"
            [formField]="stockForm.stock"
          />
          <button app-button type="submit" [disabled]="stockForm().submitting()">
            {{ stockForm().submitting() ? 'Guardando…' : 'Guardar stock' }}
          </button>
        </form>
      </div>
    </app-card>
  `,
  host: { class: 'block' },
})
export class VariantEditor {
  private readonly api = inject(ProveedorApi);

  readonly variant = input.required<MyVariant>();
  /** La presentación guardada, tal como la devuelve el backend. */
  readonly changed = output<MyVariant>();

  protected readonly cop = formatCop;

  protected readonly dataError = signal<string | null>(null);
  protected readonly dataSaved = signal(false);
  protected readonly stockError = signal<string | null>(null);
  protected readonly stockSaved = signal(false);

  protected readonly dataModel = signal<{
    presentacion: string;
    unidad: string;
    precio: number | null;
    precioOferta: number | null;
    activo: boolean;
  }>({ presentacion: '', unidad: '', precio: null, precioOferta: null, activo: true });

  protected readonly stockModel = signal<{ stock: number | null }>({ stock: null });

  protected readonly data = form(
    this.dataModel,
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
    },
    {
      submission: {
        action: () => this.saveData(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  protected readonly stockForm = form(
    this.stockModel,
    (path) => {
      validate(path.stock, ({ value }) =>
        message(validateStock(asNumber(value()), this.variant().stockReservado)),
      );
    },
    {
      submission: {
        action: () => this.saveStock(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  /** Id ya volcado a los formularios: cada fila se carga una vez y luego manda lo que se escribe. */
  private loadedId: string | null = null;

  constructor() {
    effect(() => {
      const variant = this.variant();
      if (variant.id === this.loadedId) {
        return;
      }
      this.loadedId = variant.id;
      untracked(() => {
        this.dataModel.set({
          presentacion: variant.presentacion,
          unidad: variant.unidad,
          precio: variant.precio,
          precioOferta: variant.precioOferta ?? null,
          activo: variant.activo,
        });
        this.stockModel.set({ stock: variant.stock });
      });
    });
  }

  protected clearOffer(): void {
    this.dataModel.update((m) => ({ ...m, precioOferta: null }));
  }

  /** Solo se ejecuta con los datos válidos; `submitting` vuelve a `false` al terminar. */
  private async saveData(): Promise<undefined> {
    this.dataError.set(null);
    this.dataSaved.set(false);
    const value = this.dataModel();
    const current = this.variant();
    const body: UpdateVariantRequest = {
      presentacion: value.presentacion.trim(),
      unidad: value.unidad.trim(),
      precio: value.precio ?? undefined,
      activo: value.activo,
    };
    if (value.precioOferta !== null) {
      body.precioOferta = value.precioOferta;
    } else if (current.precioOferta !== undefined) {
      body.precioOferta = null; // quitar la oferta
    }
    try {
      const saved = await firstValueFrom(this.api.updateVariant(current.id, body));
      this.dataSaved.set(true);
      this.changed.emit(saved);
    } catch (error) {
      this.dataError.set((error as ApiError).message);
    }
    return undefined;
  }

  /** Solo se ejecuta con un stock válido; `409` si el backend lo ve por debajo de lo reservado. */
  private async saveStock(): Promise<undefined> {
    this.stockError.set(null);
    this.stockSaved.set(false);
    const stock = this.stockModel().stock;
    if (stock === null) {
      return undefined;
    }
    try {
      const saved = await firstValueFrom(this.api.setStock(this.variant().id, stock));
      this.stockSaved.set(true);
      this.changed.emit(saved);
    } catch (error) {
      this.stockError.set((error as ApiError).message);
    }
    return undefined;
  }
}

function message(text: string | null) {
  return text ? { kind: 'texto', message: text } : null;
}

/** El valor de `app-input` numérico es `number | null`; aquí se descarta lo demás. */
function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}
