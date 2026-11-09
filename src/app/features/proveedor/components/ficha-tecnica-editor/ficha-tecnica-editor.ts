import { Component, computed, input, model } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { FICHA_MAX_ENTRADAS, FichaRow } from '../../models/proveedor.types';
import { FichaIssue } from '../../utils/ficha-tecnica';

/**
 * Editor de la ficha técnica: una lista de filas clave-valor que se pueden agregar, editar y
 * quitar. Las filas son un `model()` (`[(rows)]`) y los problemas de validación llegan por
 * `issues` (ver `validateFicha`): cada uno se muestra junto a su fila y los del conjunto, debajo
 * de la lista.
 *
 * Valores por defecto: `rows=[]`, `issues=[]`.
 */
@Component({
  selector: 'app-ficha-tecnica-editor',
  imports: [Input, Button, Icon],
  template: `
    <fieldset class="space-y-3">
      <legend class="mb-1 font-semibold">Ficha técnica</legend>
      <p class="text-sm text-fg-muted">
        Datos como composición, peso o registro. Hasta {{ max }} entradas.
      </p>

      @for (row of rows(); track $index) {
        <div class="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <app-input
            class="col-span-2 sm:col-span-1"
            [label]="'Clave ' + ($index + 1)"
            autocomplete="off"
            [value]="row.clave"
            [touched]="rowIssue($index) !== null"
            [errors]="issueErrors($index)"
            (valueChange)="update($index, 'clave', $event)"
          />
          <app-input
            [label]="'Valor ' + ($index + 1)"
            autocomplete="off"
            [value]="row.valor"
            [touched]="rowIssue($index) !== null"
            [errors]="[]"
            (valueChange)="update($index, 'valor', $event)"
          />
          <button
            app-button
            type="button"
            variant="ghost"
            iconOnly
            class="mt-1"
            [ariaLabel]="'Quitar la fila ' + ($index + 1)"
            (click)="remove($index)"
          >
            <app-icon name="close" />
          </button>
        </div>
      }

      @for (issue of generalIssues(); track issue.message) {
        <p class="text-sm text-danger" role="alert">{{ issue.message }}</p>
      }

      <button
        app-button
        type="button"
        variant="secondary"
        [disabled]="rows().length >= max"
        (click)="add()"
      >
        <app-icon name="plus" size="sm" /> Agregar fila
      </button>
    </fieldset>
  `,
  host: { class: 'block' },
})
export class FichaTecnicaEditor {
  readonly rows = model<FichaRow[]>([]);
  readonly issues = input<FichaIssue[]>([]);

  protected readonly max = FICHA_MAX_ENTRADAS;
  protected readonly generalIssues = computed(() => this.issues().filter((i) => i.row === null));

  protected rowIssue(index: number): FichaIssue | null {
    return this.issues().find((i) => i.row === index) ?? null;
  }

  protected issueErrors(index: number) {
    const issue = this.rowIssue(index);
    return issue ? [{ kind: 'ficha', message: issue.message }] : [];
  }

  protected add(): void {
    this.rows.update((rows) => [...rows, { clave: '', valor: '' }]);
  }

  protected remove(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected update(index: number, field: keyof FichaRow, value: string | number | null): void {
    const text = '' + (value ?? '');
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: text } : row)));
  }
}
