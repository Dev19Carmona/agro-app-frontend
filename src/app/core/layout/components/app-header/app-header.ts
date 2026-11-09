import { Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Menu } from '../../../../shared/ui/menu/menu';
import { MenuItem } from '../../../../shared/ui/menu/menu.types';
import { LogoutService, SessionService } from '../../../auth';
import { CartService } from '../../../cart';
import { NotificationBell } from '../../../notifications';
import { ThemeMenu } from '../../../theme';

const USER_ITEMS: MenuItem[] = [
  { id: 'account', label: 'Mi cuenta', icon: 'user' },
  { id: 'logout', label: 'Cerrar sesión', icon: 'log-out', dividerBefore: true },
];

/**
 * Cabecera: marca, tema, acceso del usuario y, bajo `lg`, el botón que abre el panel de
 * navegación. El visitante ve **Iniciar sesión**; con sesión, un menú con su nombre. El
 * `PRODUCTOR` ve además el enlace al carrito con el número de líneas, y el `PRODUCTOR` y el
 * `PROVEEDOR` la campana de notificaciones.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, Button, Icon, Menu, NotificationBell, ThemeMenu],
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

        @if (session.role() === 'PRODUCTOR') {
          <a
            app-button
            class="relative"
            variant="ghost"
            iconOnly
            routerLink="/carrito"
            [ariaLabel]="cartLabel()"
          >
            <app-icon name="cart" />
            @if (cart.count() > 0) {
              <span
                aria-hidden="true"
                class="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand px-1 text-xs font-semibold text-on-brand"
                >{{ cart.count() }}</span
              >
            }
          </a>
        }

        @if (session.role() === 'PRODUCTOR' || session.role() === 'PROVEEDOR') {
          <app-notification-bell />
        }

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
  protected readonly cart = inject(CartService);
  private readonly logout = inject(LogoutService);
  private readonly router = inject(Router);

  protected readonly userItems = USER_ITEMS;

  protected readonly cartLabel = computed(() => {
    const n = this.cart.count();
    return `Carrito, ${n} ${n === 1 ? 'línea' : 'líneas'}`;
  });

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
