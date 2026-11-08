import { Component, computed, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { MatCheckbox } from '@angular/material/checkbox';
import { FieldErrors, firstErrorMessage, uniqueId } from '../form-control/form-control.types';

/**
 * Casilla de verificación. La etiqueta es el contenido proyectado (admite enlaces). Es un
 * control de Signal Forms: se enlaza con `[formField]`.
 *
 * ```html
 * <app-checkbox [formField]="f.acepta" hint="Puedes retirarlo cuando quieras">
 *   Acepto el tratamiento de mis datos
 * </app-checkbox>
 * ```
 *
 * El error aparece debajo cuando el campo está tocado y tiene algún error con `message`.
 *
 * Valores por defecto: `hint=null`, `checked=false`, `required=false`, `disabled=false`.
 */
@Component({
  selector: 'app-checkbox',
  imports: [MatCheckbox],
  template: `
    <mat-checkbox
      [checked]="checked()"
      [disabled]="disabled()"
      [required]="required()"
      [aria-describedby]="describedBy()"
      (change)="checked.set($event.checked)"
      (focusout)="touch.emit()"
    >
      <ng-content />
    </mat-checkbox>
    @if (hint()) {
      <p [id]="hintId" class="ps-11 text-sm text-fg-muted">{{ hint() }}</p>
    }
    <!-- La región existe siempre, así el lector de pantalla anuncia el error al aparecer. -->
    <p [id]="errorId" aria-live="polite" class="ps-11 text-sm text-danger empty:hidden">
      @if (visibleError(); as message) {
        {{ message }}
      }
    </p>
  `,
  host: { class: 'block' },
})
export class Checkbox implements FormCheckboxControl {
  readonly hint = input<string | null>(null);

  // Contrato de control de Signal Forms: `[formField]` mantiene estas propiedades sincronizadas.
  readonly checked = model(false);
  readonly errors = input<FieldErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  protected readonly hintId = uniqueId('app-checkbox-hint');
  protected readonly errorId = uniqueId('app-checkbox-error');

  protected readonly visibleError = computed(() =>
    this.touched() ? firstErrorMessage(this.errors()) : null,
  );
  protected readonly describedBy = computed(() => {
    const ids = [this.hint() ? this.hintId : null, this.visibleError() ? this.errorId : null];
    return ids.filter(Boolean).join(' ');
  });
}
