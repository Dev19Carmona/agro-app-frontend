import { Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { IconName } from '../../shared/ui/icon/icon.types';
import { Menu } from '../../shared/ui/menu/menu';
import { MenuItem } from '../../shared/ui/menu/menu.types';
import { DemoRoleService } from '../navigation/demo-role';
import { DEMO_ROLE_OPTIONS } from '../navigation/nav.config';
import { DemoRole } from '../navigation/navigation.types';
import { ThemeService } from '../theme/theme';
import { ThemeMode } from '../theme/theme.types';

const ROLE_ITEMS: MenuItem[] = DEMO_ROLE_OPTIONS.map(({ id, label }) => ({ id, label }));

const THEME_ITEMS: MenuItem[] = [
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Oscuro', icon: 'moon' },
  { id: 'system', label: 'Sistema', icon: 'monitor' },
];

const THEME_ICONS: Record<ThemeMode, IconName> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};

const GUEST_USER_ITEMS: MenuItem[] = [
  { id: 'login', label: 'Iniciar sesión', icon: 'log-in' },
  { id: 'register', label: 'Registrarse', icon: 'plus' },
];

const LOGGED_USER_ITEMS: MenuItem[] = [
  { id: 'account', label: 'Mi cuenta', icon: 'user' },
  { id: 'logout', label: 'Cerrar sesión', icon: 'log-out', dividerBefore: true },
];

const USER_ROUTES: Record<string, string> = {
  login: '/auth/login',
  register: '/auth/registro',
  account: '/cuenta',
};

/**
 * Cabecera: marca, selector de rol de demo, tema, menú de usuario simulado y, bajo `lg`, el botón
 * que abre el panel de navegación.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, Button, Icon, Menu],
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
        <!-- Rol de demo: con texto desde sm; solo icono por debajo, para que quepa en 360 px. -->
        <!-- La visibilidad va en un span: el host de app-menu ya fija su propio display. -->
        <span class="hidden sm:inline-flex">
          <app-menu
            [label]="roleLabel()"
            [ariaLabel]="'Rol de demo: ' + roleLabel()"
            icon="users"
            [items]="roleItems"
            selectable
            [selectedId]="demoRole.role()"
            align="end"
            variant="secondary"
            (itemSelect)="onRole($event)"
          />
        </span>
        <span class="inline-flex sm:hidden">
          <app-menu
            [label]="'Rol de demo: ' + roleLabel()"
            icon="users"
            iconOnly
            [items]="roleItems"
            selectable
            [selectedId]="demoRole.role()"
            align="end"
            variant="secondary"
            (itemSelect)="onRole($event)"
          />
        </span>

        <app-menu
          label="Tema"
          [icon]="themeIcon()"
          iconOnly
          variant="ghost"
          [items]="themeItems"
          selectable
          [selectedId]="theme.mode()"
          align="end"
          (itemSelect)="onTheme($event)"
        />

        <app-menu
          label="Menú de usuario"
          icon="user"
          iconOnly
          variant="ghost"
          [items]="userItems()"
          align="end"
          (itemSelect)="onUserAction($event)"
        />

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
  protected readonly theme = inject(ThemeService);
  protected readonly demoRole = inject(DemoRoleService);
  private readonly router = inject(Router);

  protected readonly roleItems = ROLE_ITEMS;
  protected readonly themeItems = THEME_ITEMS;

  /** Si el panel (drawer) está abierto; solo afecta al estado del botón. */
  readonly panelOpen = input(false);
  /** Se emite al pulsar el botón del panel. */
  readonly panelToggle = output<void>();

  protected readonly roleLabel = computed(
    () => ROLE_ITEMS.find((item) => item.id === this.demoRole.role())?.label ?? '',
  );
  protected readonly themeIcon = computed(() => THEME_ICONS[this.theme.mode()]);
  protected readonly userItems = computed(() =>
    this.demoRole.role() === 'VISITANTE' ? GUEST_USER_ITEMS : LOGGED_USER_ITEMS,
  );

  // Los ids vienen de `ROLE_ITEMS` y `THEME_ITEMS`; los servicios descartan cualquier otro valor.
  protected onRole(id: string): void {
    this.demoRole.setRole(id as DemoRole);
  }

  protected onTheme(id: string): void {
    this.theme.setMode(id as ThemeMode);
  }

  /** Menú de usuario simulado: navega a la pantalla o vuelve a `VISITANTE` al "cerrar sesión". */
  protected onUserAction(id: string): void {
    if (id === 'logout') {
      this.demoRole.setRole('VISITANTE');
      void this.router.navigateByUrl('/catalogo');
      return;
    }
    const route = USER_ROUTES[id];
    if (route) {
      void this.router.navigateByUrl(route);
    }
  }
}
