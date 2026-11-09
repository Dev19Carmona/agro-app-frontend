import {
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { AdminCategory, CATEGORY_NAME_MAX_LENGTH } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';

/**
 * Formulario de una categoría. Sin `category` crea una (`POST /catalog/categories`); con `category`
 * la renombra (`PATCH`). El nombre se recorta y se valida (1 a 100 caracteres); si el backend
 * responde `409` (nombre repetido sin distinguir mayúsculas ni tildes) el mensaje sale junto al
 * campo y se conserva lo escrito. Emite `saved` con la categoría que devuelve el backend; al crear,
 * el campo se vacía. `cancelled` solo se emite al renombrar.
 */
@Component({
  selector: 'app-category-form',
  imports: [FormRoot, FormField, Input, Button, Alert],
  template: `
    <form [formRoot]="f" class="flex flex-wrap items-start gap-3">
      <div class="w-full sm:w-80">
        <app-input
          [label]="category() ? 'Nuevo nombre' : 'Nombre de la categoría'"
          autocomplete="off"
          [formField]="f.nombre"
        />
      </div>
      <button app-button type="submit" class="mt-1" [disabled]="f().submitting()">
        {{ category() ? 'Guardar' : 'Crear categoría' }}
      </button>
      @if (category()) {
        <button
          app-button
          type="button"
          variant="ghost"
          class="mt-1"
          [disabled]="f().submitting()"
          (click)="cancelled.emit()"
        >
          Cancelar
        </button>
      }
    </form>
    @if (error(); as message) {
      <app-alert variant="danger" class="mt-3">{{ message }}</app-alert>
    }
  `,
  host: { class: 'block' },
})
export class CategoryForm {
  private readonly api = inject(AdminApi);

  /** La categoría que se renombra; sin ella el formulario crea una nueva. */
  readonly category = input<AdminCategory | null>(null);

  readonly saved = output<AdminCategory>();
  readonly cancelled = output<void>();

  /** Error del backend que no es de nombre repetido (se muestra en una alerta). */
  protected readonly error = signal<string | null>(null);
  /** `409` del backend: se muestra junto al campo hasta que se edita el nombre. */
  private readonly conflict = signal<string | null>(null);
  protected readonly model = linkedSignal(() => ({ nombre: this.category()?.nombre ?? '' }));

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe el nombre de la categoría' });
      validate(path.nombre, ({ value }) => {
        const text = value().trim();
        if (text.length === 0) {
          return { kind: 'required', message: 'Escribe el nombre de la categoría' };
        }
        if (text.length > CATEGORY_NAME_MAX_LENGTH) {
          return { kind: 'max', message: `Máximo ${CATEGORY_NAME_MAX_LENGTH} caracteres` };
        }
        const conflict = this.conflict();
        return conflict ? { kind: 'conflict', message: conflict } : null;
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  constructor() {
    // Editar el nombre quita el aviso de nombre repetido.
    effect(() => {
      this.model().nombre;
      untracked(() => this.conflict.set(null));
    });
  }

  /** Se ejecuta solo con el formulario válido; `submitting` vuelve a `false` al terminar. */
  private async save(): Promise<undefined> {
    this.error.set(null);
    const nombre = this.model().nombre.trim();
    const category = this.category();
    try {
      const saved = await firstValueFrom(
        category
          ? this.api.updateCategory(category.id, { nombre })
          : this.api.createCategory(nombre),
      );
      if (!category) {
        this.model.set({ nombre: '' });
        this.f().reset();
      }
      this.saved.emit(saved);
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.status === 409) {
        this.conflict.set(apiError.message);
      } else {
        this.error.set(apiError.message);
      }
    }
    return undefined;
  }
}
