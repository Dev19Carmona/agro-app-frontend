import { Component, DestroyRef, DOCUMENT, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { Button } from '../../shared/ui/button/button';
import { Drawer } from '../../shared/ui/drawer/drawer';
import { Icon } from '../../shared/ui/icon/icon';
import { AppHeader } from './app-header';
import { AppSidePanel } from './app-side-panel';

/** Punto de corte `lg` de Tailwind: desde aquí el panel es fijo; por debajo, es un drawer. */
const LG_QUERY = '(min-width: 1024px)';

/**
 * Layout de la app: header arriba, panel de navegación a la derecha y la ruta activa al centro.
 * Por debajo de `lg` el panel pasa a un drawer que entra por la derecha.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, AppSidePanel, Drawer, Button, Icon],
  template: `
    <a
      href="#main-content"
      class="sr-only rounded-pill bg-brand px-4 py-2 font-semibold text-on-brand no-underline focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
      (click)="skipToContent($event)"
    >
      Saltar al contenido
    </a>

    <app-drawer [(open)]="drawerOpen" side="end" label="Navegación principal">
      <div drawerPanel class="flex h-full flex-col gap-4 p-4">
        <div class="flex items-center justify-between">
          <p class="font-serif text-xl">Mini-Croper</p>
          <button
            app-button
            variant="ghost"
            size="sm"
            iconOnly
            ariaLabel="Cerrar navegación"
            (click)="drawerOpen.set(false)"
          >
            <app-icon name="close" />
          </button>
        </div>
        <app-side-panel (navigated)="drawerOpen.set(false)" />
      </div>

      <div class="flex min-h-dvh flex-col">
        <div class="mx-auto w-full max-w-[96rem] px-4 pt-3 lg:px-6">
          <app-header [panelOpen]="drawerOpen()" (panelToggle)="drawerOpen.set(!drawerOpen())" />
        </div>

        <div class="mx-auto flex w-full max-w-[96rem] flex-1 items-start gap-6 px-4 pt-4 pb-8 lg:px-6">
          <main id="main-content" #main tabindex="-1" class="min-w-0 flex-1 outline-none">
            <router-outlet />
          </main>

          <aside
            class="sticky top-24 hidden max-h-[calc(100dvh-7.5rem)] w-72 shrink-0 overflow-y-auto rounded-xl border border-line bg-surface p-3 lg:block"
          >
            <app-side-panel />
          </aside>
        </div>
      </div>
    </app-drawer>
  `,
  host: { class: 'block' },
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** Si el drawer de navegación está abierto (solo tiene sentido bajo `lg`). */
  protected readonly drawerOpen = signal(false);

  constructor() {
    // Al pasar a una pantalla grande el panel ya es fijo: el drawer debe cerrarse.
    const query = inject(DOCUMENT).defaultView?.matchMedia?.(LG_QUERY);
    if (query) {
      const onChange = (event: MediaQueryListEvent) => {
        if (event.matches) {
          this.drawerOpen.set(false);
        }
      };
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    // Tras cada navegación (menos la inicial) el foco pasa al contenido: así quien usa teclado
    // o lector de pantalla no se queda en el enlace del panel.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.focusMain());
  }

  protected skipToContent(event: Event): void {
    // Sin esto el `href="#…"` navegaría a `/#main-content` por el `<base href="/">`.
    event.preventDefault();
    this.focusMain();
  }

  private focusMain(): void {
    this.main().nativeElement.focus({ preventScroll: false });
  }
}
