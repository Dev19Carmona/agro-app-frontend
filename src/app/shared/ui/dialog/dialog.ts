import {
  Component,
  DestroyRef,
  TemplateRef,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Button } from '../button/button';
import { DialogVariant } from './dialog.types';

let nextId = 0;

/**
 * Diálogo modal de confirmación con título, descripción, contenido proyectado opcional y los
 * botones Cancelar y Confirmar.
 *
 * ```html
 * <app-dialog
 *   [(open)]="open"
 *   title="Deshabilitar cuenta"
 *   description="Se cerrarán todas sus sesiones."
 *   confirmLabel="Deshabilitar"
 *   variant="danger"
 *   [busy]="busy()"
 *   (confirmed)="disable()"
 * >
 *   <app-input … />  <!-- contenido opcional -->
 * </app-dialog>
 * ```
 *
 * Al abrir, el foco pasa al diálogo y queda atrapado; al cerrar vuelve al elemento que lo abrió.
 * Esc, el fondo y Cancelar cierran sin confirmar y emiten `cancelled`. Confirmar emite `confirmed`
 * y **no** cierra: quien lo usa pone `open` en `false` cuando termina la acción (así puede mostrar
 * `busy` y dejar abierto el diálogo si falla). Con `busy` los botones quedan deshabilitados y ni Esc
 * ni el fondo cierran.
 *
 * Valores por defecto: `open=false`, `confirmLabel='Confirmar'`, `cancelLabel='Cancelar'`,
 * `variant='primary'`, `busy=false`. `title` es obligatorio; `description` también (se anuncia).
 */
@Component({
  selector: 'app-dialog',
  imports: [Button],
  template: `
    <ng-template #panel>
      <div class="space-y-4 p-6">
        <h2 [id]="titleId" class="font-serif text-2xl">{{ title() }}</h2>
        <p [id]="descriptionId" class="text-fg-muted">{{ description() }}</p>
        <ng-content />
        <div class="flex flex-wrap justify-end gap-3 pt-2">
          <button app-button variant="secondary" [disabled]="busy()" (click)="cancel()">
            {{ cancelLabel() }}
          </button>
          <button app-button [variant]="variant()" [disabled]="busy()" (click)="confirmed.emit()">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class Dialog {
  /** Si el diálogo está abierto. Se puede enlazar con `[(open)]`. */
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly variant = input<DialogVariant>('primary');
  /** Acción en curso: deshabilita los botones y bloquea el cierre. */
  readonly busy = input(false);

  /** El usuario pulsó el botón de confirmar. */
  readonly confirmed = output<void>();
  /** El usuario cerró sin confirmar (Cancelar, Esc o clic en el fondo). */
  readonly cancelled = output<void>();

  protected readonly titleId = `app-dialog-title-${nextId}`;
  protected readonly descriptionId = `app-dialog-description-${nextId++}`;

  private readonly dialogs = inject(MatDialog);
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private ref: MatDialogRef<unknown> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.ref?.close()));
    });
    effect(() => {
      const busy = this.busy();
      if (this.ref) {
        this.ref.disableClose = busy;
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.ref?.close();
    });
  }

  protected cancel(): void {
    this.open.set(false);
    this.cancelled.emit();
  }

  private show(): void {
    if (this.ref) {
      return;
    }
    const ref = this.dialogs.open(this.panel(), {
      ariaLabelledBy: this.titleId,
      ariaDescribedBy: this.descriptionId,
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: this.busy(),
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    this.ref = ref;
    ref.afterClosed().subscribe(() => {
      this.ref = null;
      if (!this.destroyed && this.open()) {
        // Lo cerró el usuario (Esc o fondo), no el consumidor.
        this.open.set(false);
        this.cancelled.emit();
      }
    });
  }
}
