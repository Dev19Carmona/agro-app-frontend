import { Component, signal } from '@angular/core';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog, Button, Input],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Dialog (app-dialog)</h1>

      <section aria-labelledby="dialog-basic" class="space-y-3">
        <h2 id="dialog-basic" class="text-xl">Confirmación</h2>
        <p class="text-fg-muted">
          El foco queda atrapado en el diálogo. Esc, el fondo y Cancelar cierran sin confirmar; al
          cerrar, el foco vuelve al botón que lo abrió.
        </p>
        <div class="flex flex-wrap gap-3">
          <button app-button (click)="primaryOpen.set(true)">Cambiar rol</button>
          <button app-button variant="danger" (click)="dangerOpen.set(true)">Deshabilitar</button>
          <button app-button variant="secondary" (click)="contentOpen.set(true)">
            Con contenido
          </button>
        </div>
        <p class="text-sm text-fg-muted" aria-live="polite">
          Último resultado: <code>{{ result() }}</code>
        </p>
      </section>

      <app-dialog
        [(open)]="primaryOpen"
        title="Cambiar rol"
        description="La cuenta pasará a otro rol y se cerrarán sus sesiones."
        confirmLabel="Cambiar rol"
        (confirmed)="finish(primaryOpen, 'rol cambiado')"
        (cancelled)="result.set('cancelado')"
      />

      <app-dialog
        [(open)]="dangerOpen"
        title="Deshabilitar cuenta"
        description="Esta acción cierra todas las sesiones de la cuenta."
        confirmLabel="Deshabilitar"
        variant="danger"
        [busy]="busy()"
        (confirmed)="simulate()"
        (cancelled)="result.set('cancelado')"
      />

      <app-dialog
        [(open)]="contentOpen"
        title="Rechazar solicitud"
        description="Puedes indicar un motivo (opcional)."
        confirmLabel="Rechazar"
        variant="danger"
        (confirmed)="finish(contentOpen, 'rechazado: ' + (reason() || 'sin motivo'))"
        (cancelled)="result.set('cancelado')"
      >
        <app-input label="Motivo" [(value)]="reason" />
      </app-dialog>
    </div>
  `,
})
export class DialogDemo {
  protected readonly primaryOpen = signal(false);
  protected readonly dangerOpen = signal(false);
  protected readonly contentOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly reason = signal('');
  protected readonly result = signal('ninguno');

  protected finish(open: { set(value: boolean): void }, message: string): void {
    this.result.set(message);
    open.set(false);
  }

  /** Simula una acción de 1,5 s: mientras dura, el diálogo no se puede cerrar. */
  protected simulate(): void {
    this.busy.set(true);
    setTimeout(() => {
      this.busy.set(false);
      this.finish(this.dangerOpen, 'cuenta deshabilitada');
    }, 1500);
  }
}
