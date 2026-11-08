import { Component, signal } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Drawer } from './drawer';
import { DrawerSide } from './drawer.types';

@Component({
  imports: [Drawer, Button, Icon],
  template: `
    <app-drawer [(open)]="open" [side]="side()" label="Navegación de ejemplo">
      <nav drawerPanel class="flex h-full flex-col gap-1 p-4" aria-label="Ejemplo">
        <div class="mb-2 flex items-center justify-between">
          <p class="font-serif text-xl">Navegación</p>
          <button app-button variant="ghost" size="sm" iconOnly ariaLabel="Cerrar panel" (click)="open.set(false)">
            <app-icon name="close" />
          </button>
        </div>
        @for (link of links; track link.label) {
          <a
            href="#"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-fg hover:bg-sunken"
            (click)="$event.preventDefault(); open.set(false)"
          >
            <app-icon [name]="link.icon" />
            {{ link.label }}
          </a>
        }
      </nav>

      <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
        <h1 class="text-3xl sm:text-4xl">Drawer (app-drawer)</h1>

        <section aria-labelledby="drawer-open" class="space-y-3">
          <h2 id="drawer-open" class="text-xl">Abrir y cerrar</h2>
          <p class="text-fg-muted">
            El panel cierra con Esc, con clic en el fondo o con su botón. El foco vuelve al botón
            que lo abrió.
          </p>
          <div class="flex flex-wrap gap-3">
            <button app-button (click)="show('end')">Abrir por la derecha</button>
            <button app-button variant="secondary" (click)="show('start')">
              Abrir por la izquierda
            </button>
          </div>
          <p class="text-sm text-fg-muted" aria-live="polite">
            Estado: <code>{{ open() ? 'abierto' : 'cerrado' }}</code>
          </p>
        </section>
      </div>
    </app-drawer>
  `,
})
export class DrawerDemo {
  protected readonly open = signal(false);
  protected readonly side = signal<DrawerSide>('end');

  protected readonly links = [
    { label: 'Catálogo', icon: 'grid' },
    { label: 'Carrito', icon: 'cart' },
    { label: 'Pedidos', icon: 'receipt' },
    { label: 'Pagos', icon: 'credit-card' },
  ] as const;

  protected show(side: DrawerSide): void {
    this.side.set(side);
    this.open.set(true);
  }
}
