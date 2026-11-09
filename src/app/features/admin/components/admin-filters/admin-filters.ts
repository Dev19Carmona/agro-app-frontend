import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { isObjectId } from '../../utils/filter-params';

/** Un campo de filtro: un selector (se aplica al elegir) o un texto (se aplica con **Filtrar**). */
export interface AdminFilterField {
  /** Nombre del parámetro de la URL (`rol`, `status`, `buyerId`…). */
  key: string;
  label: string;
  kind: 'select' | 'text';
  /** Solo `select`; el primer valor suele ser `''` («Todos»). */
  options?: readonly SelectOption[];
  /** Solo `text`: exige un id de 24 hexadecimales. */
  objectId?: boolean;
  /** Mensaje cuando un campo `objectId` no es válido. */
  invalidMessage?: string;
}

/**
 * Barra de filtros de las listas de administración. Recibe los valores aplicados (`values`, los de
 * la URL) y emite el conjunto nuevo en `valuesChange` (solo claves con valor). Un selector aplica al
 * elegir; los campos de texto se aplican juntos con **Filtrar** y uno inválido no se emite y muestra
 * su error. **Quitar filtros** aparece mientras haya alguno aplicado.
 */
@Component({
  selector: 'app-admin-filters',
  imports: [Button, Input, Select],
  template: `
    <form
      class="flex flex-wrap items-start gap-3"
      [attr.aria-label]="ariaLabel()"
      (submit)="submit($event)"
    >
      @for (field of fields(); track field.key) {
        @if (field.kind === 'select') {
          <div class="w-full sm:w-56">
            <app-select
              [label]="field.label"
              [options]="field.options ?? []"
              [value]="values()[field.key] ?? ''"
              (valueChange)="choose(field.key, $event)"
            />
          </div>
        } @else {
          <div class="w-full sm:w-80">
            <app-input
              [label]="field.label"
              autocomplete="off"
              [value]="drafts()[field.key] ?? ''"
              [errors]="errorsFor(field.key)"
              [touched]="!!fieldErrors()[field.key]"
              (valueChange)="write(field.key, $event)"
            />
          </div>
        }
      }
      @if (hasText()) {
        <button app-button type="submit" variant="secondary" class="mt-1">Filtrar</button>
      }
      @if (active()) {
        <button app-button type="button" variant="ghost" class="mt-1" (click)="clear()">
          Quitar filtros
        </button>
      }
    </form>
  `,
  host: { class: 'block' },
})
export class AdminFilters {
  readonly fields = input.required<readonly AdminFilterField[]>();
  /** Valores aplicados (los de la URL). */
  readonly values = input.required<Readonly<Record<string, string>>>();
  readonly ariaLabel = input.required<string>();

  readonly valuesChange = output<Record<string, string>>();

  /** Texto de los campos de texto: sigue a la URL y lo escrito se aplica con **Filtrar**. */
  protected readonly drafts = linkedSignal<Record<string, string>>(() => ({ ...this.values() }));
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly hasText = computed(() => this.fields().some((f) => f.kind === 'text'));
  protected readonly active = computed(() => Object.values(this.values()).some((v) => !!v));

  protected errorsFor(key: string) {
    const message = this.fieldErrors()[key];
    return message ? [{ kind: 'invalid', message }] : [];
  }

  protected write(key: string, value: string | number | null): void {
    this.drafts.update((d) => ({ ...d, [key]: value === null ? '' : String(value) }));
    this.fieldErrors.update(({ [key]: _removed, ...rest }) => rest);
  }

  protected choose(key: string, value: string): void {
    if (value === (this.values()[key] ?? '')) {
      return;
    }
    this.emit({ ...this.values(), [key]: value });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const next: Record<string, string> = { ...this.values() };
    const errors: Record<string, string> = {};
    for (const field of this.fields()) {
      if (field.kind !== 'text') {
        continue;
      }
      const draft = (this.drafts()[field.key] ?? '').trim();
      if (field.objectId && draft !== '' && !isObjectId(draft)) {
        errors[field.key] =
          field.invalidMessage ?? 'Escribe un id de 24 caracteres entre 0-9 y a-f';
      }
      next[field.key] = draft;
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    if (this.sameAsApplied(next)) {
      return;
    }
    this.emit(next);
  }

  protected clear(): void {
    this.fieldErrors.set({});
    this.emit({});
  }

  private sameAsApplied(next: Record<string, string>): boolean {
    const current = this.values();
    const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
    return [...keys].every((key) => (current[key] ?? '') === (next[key] ?? ''));
  }

  private emit(values: Record<string, string>): void {
    this.valuesChange.emit(
      Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
    );
  }
}
