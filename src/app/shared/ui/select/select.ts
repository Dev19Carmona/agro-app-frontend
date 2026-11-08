import {
  ChangeDetectorRef,
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { FieldErrors, firstErrorMessage } from '../form-control/form-control.types';
import { SelectOption } from './select.types';

/**
 * Lista desplegable de una sola opción, con etiqueta, ayuda y error accesibles. Es un control de
 * Signal Forms: se enlaza con `[formField]`.
 *
 * ```html
 * <app-select label="Rol" [options]="roles" [formField]="f.rol" />
 * ```
 *
 * `value` es el `value` de la opción elegida; `''` significa "sin elegir" y muestra `placeholder`.
 *
 * Valores por defecto: `hint=null`, `placeholder=''`, `value=''`, `required=false`,
 * `disabled=false`.
 */
@Component({
  selector: 'app-select',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatSelect, MatOption],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <mat-select
        [value]="value()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [required]="required()"
        [errorStateMatcher]="matcher"
        (valueChange)="value.set($event)"
        (openedChange)="onOpenedChange($event)"
        (blur)="touch.emit()"
      >
        @for (option of options(); track option.value) {
          <mat-option [value]="option.value" [disabled]="option.disabled ?? false">
            {{ option.label }}
          </mat-option>
        }
      </mat-select>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error>{{ errorMessage() }}</mat-error>
    </mat-form-field>
  `,
  host: { class: 'block' },
})
export class Select implements FormValueControl<string> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly hint = input<string | null>(null);
  readonly placeholder = input('');

  // Contrato de control de Signal Forms: `[formField]` mantiene estas propiedades sincronizadas.
  readonly value = model('');
  readonly errors = input<FieldErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  protected readonly errorMessage = computed(() => firstErrorMessage(this.errors()));
  private readonly showError = computed(() => this.touched() && this.errorMessage() !== null);

  /** Material pinta el error según este criterio, no según un `NgControl` (no hay uno). */
  protected readonly matcher = { isErrorState: () => this.showError() };

  private readonly matSelect = viewChild(MatSelect);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Material solo recalcula su estado de error con un `NgControl`; aquí se le avisa a mano.
    effect(() => {
      this.showError();
      this.matSelect()?.updateErrorState();
      this.cdr.markForCheck();
    });
    // Con el campo tocado desde el primer render, el efecto corre antes de que exista el select.
    afterNextRender(() => {
      this.matSelect()?.updateErrorState();
      this.cdr.markForCheck();
    });
  }

  /** Al cerrarse la lista el usuario terminó de interactuar: se marca como tocado. */
  protected onOpenedChange(opened: boolean): void {
    if (!opened) {
      this.touch.emit();
    }
  }
}
