import { Component, signal } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Popover, PopoverTrigger } from './popover';

@Component({
  imports: [Popover, PopoverTrigger, Button, Icon],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Popover (app-popover)</h1>

      <section aria-labelledby="popover-start" class="space-y-3">
        <h2 id="popover-start" class="text-xl">Alineado al inicio</h2>
        <app-popover [(open)]="openStart" ariaLabel="Detalles del pedido">
          <button appPopoverTrigger app-button variant="secondary">
            Ver detalles
            <app-icon name="chevron-down" size="sm" />
          </button>
          <div class="space-y-2 p-4">
            <p class="font-semibold">Pedido 64f0c0a1b2c3d4e5f6a7b8c9</p>
            <p class="text-sm text-fg-muted">
              Un panel anclado al botón. Esc o un clic fuera lo cierran y el foco vuelve al botón.
            </p>
            <button app-button size="sm" (click)="openStart.set(false)">Cerrar</button>
          </div>
        </app-popover>
        <p class="text-sm text-fg-muted" aria-live="polite">
          Estado: <code>{{ openStart() ? 'abierto' : 'cerrado' }}</code>
        </p>
      </section>

      <section aria-labelledby="popover-end" class="space-y-3">
        <h2 id="popover-end" class="text-xl">Alineado al borde derecho</h2>
        <div class="flex justify-end">
          <app-popover [(open)]="openEnd" ariaLabel="Notificaciones de ejemplo" align="end">
            <button
              appPopoverTrigger
              app-button
              variant="ghost"
              iconOnly
              ariaLabel="Notificaciones"
            >
              <app-icon name="bell" />
            </button>
            <ul class="divide-y divide-line">
              @for (n of notes; track n) {
                <li class="p-3 text-sm wrap-break-word">{{ n }}</li>
              }
            </ul>
          </app-popover>
        </div>
      </section>
    </div>
  `,
})
export class PopoverDemo {
  protected readonly openStart = signal(false);
  protected readonly openEnd = signal(false);
  protected readonly notes = [
    'Pago aprobado: el pedido 64f0c0a1b2c3d4e5f6a7b8c9 fue confirmado.',
    'Tu pedido fue confirmado.',
  ];
}
