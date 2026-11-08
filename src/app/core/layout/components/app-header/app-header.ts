import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Menu } from '../../../../shared/ui/menu/menu';
import { MenuItem } from '../../../../shared/ui/menu/menu.types';
import { LogoutService } from '../../../auth';
import { SessionService } from '../../../auth';

import { ThemeMenu } from '../../../theme';

const USER_ITEMS: MenuItem[] = [
  { id: 'account', label: 'Mi cuenta', icon: 'user' },
  { id: 'logout', label: 'Cerrar sesión', icon: 'log-out', dividerBefore: true },
];

/**
 * Cabecera: marca, tema, acceso del usuario y, bajo `lg`, el botón que abre el panel de
 * navegación. El visitante ve **Iniciar sesión**; con sesión, un menú con su nombre.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, Button, Icon, Menu, ThemeMenu],
  template: `
    <header
      class="sticky top-3 z-10 flex h-16 items-center justify-between gap-2 rounded-xl border border-line bg-surface/90 px-3 backdrop-blur sm:px-4"
    >
      <a
        routerLink="/"
        aria-label="Mini-Croper, ir al inicio"
        class="flex items-center gap-3 rounded-pill text-fg no-underline"
      >
        <span
          class="inline-flex size-10 items-center justify-center rounded-pill bg-brand text-on-brand"
        >
          <app-icon name="leaf" />
        </span>
        <span class="hidden font-serif text-xl sm:inline" aria-hidden="true">Mini-Croper</span>
      </a>

      <div class="flex items-center gap-1 sm:gap-2">
        <app-theme-menu />

        @if (session.user(); as user) {
          <!-- Con nombre desde sm; solo icono por debajo, para que quepa en 360 px. -->
          <!-- La visibilidad va en un span: el host de app-menu ya fija su propio display. -->
          <span class="hidden sm:inline-flex">
            <app-menu
              [label]="user.nombre"
              [ariaLabel]="'Menú de usuario: ' + user.nombre"
              icon="user"
              [items]="userItems"
              align="end"
              variant="secondary"
              (itemSelect)="onUserAction($event)"
            />
          </span>
          <span class="inline-flex sm:hidden">
            <app-menu
              [label]="'Menú de usuario: ' + user.nombre"
              icon="user"
              iconOnly
              [items]="userItems"
              align="end"
              variant="ghost"
              (itemSelect)="onUserAction($event)"
            />
          </span>
        } @else {
          <a app-button routerLink="/auth/login" size="md">Iniciar sesión</a>
        }

        <button
          app-button
          class="lg:hidden"
          variant="ghost"
          iconOnly
          [ariaLabel]="panelOpen() ? 'Cerrar navegación' : 'Abrir navegación'"
          [attr.aria-expanded]="panelOpen()"
          (click)="panelToggle.emit()"
        >
          <app-icon name="menu" />
        </button>
      </div>
    </header>
  `,
  host: { class: 'block' },
})
export class AppHeader {
  protected readonly session = inject(SessionService);
  private readonly logout = inject(LogoutService);
  private readonly router = inject(Router);

  protected readonly userItems = USER_ITEMS;

  /** Si el panel (drawer) está abierto; solo afecta al estado del botón. */
  readonly panelOpen = input(false);
  /** Se emite al pulsar el botón del panel. */
  readonly panelToggle = output<void>();

  /** Menú de usuario: va a la cuenta o cierra la sesión. */
  protected onUserAction(id: string): void {
    if (id === 'logout') {
      void this.logout.logout();
    } else if (id === 'account') {
      void this.router.navigateByUrl('/cuenta');
    }
  }
}
