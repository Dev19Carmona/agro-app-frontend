import {
  Component,
  ElementRef,
  ChangeDetectorRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { MatFormField, MatHint, MatError, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Button } from '../button/button';
import { FieldErrors, firstErrorMessage } from '../form-control/form-control.types';
import { Icon } from '../icon/icon';
import { InputType } from './input.types';

/**
 * Campo de texto con etiqueta, ayuda y error accesibles. Es un control de Signal Forms: se enlaza
 * con `[formField]` y recibe solo el estado del campo (errores, deshabilitado, etc.).
 *
 * ```html
 * <app-input label="Correo" type="email" [formField]="f.email" />
 * ```
 *
 * El error se muestra cuando el campo está tocado y tiene algún error con `message`. Sin Signal
 * Forms se puede usar con `[(value)]`, `[errors]` y `[touched]`.
 *
 * Valores por defecto: `type='text'`, `hint=null`, `placeholder=''`, `autocomplete=null`,
 * `value=''`, `required=false`, `readonly=false`, `disabled=false`.
 */
@Component({
  selector: 'app-input',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatInput, MatSuffix, Button, Icon],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <input
        #field
        matInput
        [type]="inputType()"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.name]="name() || null"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [required]="required()"
        [errorStateMatcher]="matcher"
        (input)="onInput($event)"
        (blur)="touch.emit()"
      />
      @if (type() === 'password') {
        <button
          matSuffix
          app-button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          [ariaLabel]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="revealed()"
          (click)="revealed.set(!revealed())"
        >
          <app-icon [name]="revealed() ? 'eye-off' : 'eye'" size="sm" />
        </button>
      }
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error>{{ errorMessage() }}</mat-error>
    </mat-form-field>
  `,
  host: { class: 'block' },
})
export class Input implements FormValueControl<string> {
  readonly label = input.required<string>();
  readonly type = input<InputType>('text');
  readonly hint = input<string | null>(null);
  readonly placeholder = input('');
  /** Valor del atributo HTML `autocomplete` (p. ej. `email`, `current-password`). */
  readonly autocomplete = input<string | null>(null);

  // Contrato de control de Signal Forms: `[formField]` mantiene estas propiedades sincronizadas.
  readonly value = model('');
  readonly errors = input<FieldErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  protected readonly revealed = signal(false);
  private readonly fieldEl = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly matInput = viewChild(MatInput);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
  protected readonly errorMessage = computed(() => firstErrorMessage(this.errors()));
  private readonly showError = computed(() => this.touched() && this.errorMessage() !== null);

  /** Material pinta el error según este criterio, no según un `NgControl` (no hay uno). */
  protected readonly matcher = { isErrorState: () => this.showError() };

  constructor() {
    // Material solo recalcula su estado de error con un `NgControl`; aquí se le avisa a mano.
    effect(() => {
      this.showError();
      this.matInput()?.updateErrorState();
      this.cdr.markForCheck();
    });
    // Con el campo tocado desde el primer render, el efecto corre antes de que exista el input.
    afterNextRender(() => {
      this.matInput()?.updateErrorState();
      this.cdr.markForCheck();
    });
  }

  /** Lleva el foco al campo (lo usa `[formField]` al enfocar el primer error). */
  focus(options?: FocusOptions): void {
    this.fieldEl().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
