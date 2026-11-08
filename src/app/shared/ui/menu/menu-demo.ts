import { Component, signal } from '@angular/core';
import { Menu } from './menu';
import { MenuItem } from './menu.types';

@Component({
  imports: [Menu],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Menu (app-menu)</h1>

      <section aria-labelledby="menu-actions" class="space-y-3">
        <h2 id="menu-actions" class="text-xl">Acciones</h2>
        <div class="flex flex-wrap items-center gap-3">
          <app-menu label="Mi cuenta" icon="user" [items]="account" (itemSelect)="last.set($event)" />
          <app-menu
            label="Menú de usuario"
            icon="user"
            iconOnly
            variant="ghost"
            [items]="account"
            (itemSelect)="last.set($event)"
          />
        </div>
        <p class="text-sm text-fg-muted" aria-live="polite">
          Última acción: <code>{{ last() ?? 'ninguna' }}</code>
        </p>
      </section>

      <section aria-labelledby="menu-select" class="space-y-3">
        <h2 id="menu-select" class="text-xl">Opciones excluyentes</h2>
        <div class="flex flex-wrap items-center gap-3">
          <app-menu
            label="Rol de demo"
            [items]="roles"
            selectable
            [selectedId]="role()"
            (itemSelect)="role.set($event)"
          />
        </div>
        <p class="text-sm text-fg-muted" aria-live="polite">
          Rol elegido: <code>{{ role() }}</code>
        </p>
      </section>

      <section aria-labelledby="menu-align" class="space-y-3">
        <h2 id="menu-align" class="text-xl">Alineado al borde derecho</h2>
        <div class="flex justify-end">
          <app-menu
            label="Tema"
            icon="sun"
            align="end"
            variant="ghost"
            selectable
            [items]="themes"
            [selectedId]="theme()"
            (itemSelect)="theme.set($event)"
          />
        </div>
      </section>
    </div>
  `,
})
export class MenuDemo {
  protected readonly last = signal<string | null>(null);
  protected readonly role = signal('PRODUCTOR');
  protected readonly theme = signal('system');

  protected readonly account: MenuItem[] = [
    { id: 'profile', label: 'Mi perfil', icon: 'user' },
    { id: 'password', label: 'Cambiar contraseña', icon: 'shield' },
    { id: 'logout', label: 'Cerrar sesión', icon: 'log-out', dividerBefore: true },
  ];

  protected readonly roles: MenuItem[] = [
    { id: 'VISITANTE', label: 'Visitante' },
    { id: 'PRODUCTOR', label: 'Productor' },
    { id: 'PROVEEDOR', label: 'Proveedor' },
    { id: 'ADMIN', label: 'Administrador' },
  ];

  protected readonly themes: MenuItem[] = [
    { id: 'light', label: 'Claro', icon: 'sun' },
    { id: 'dark', label: 'Oscuro', icon: 'moon' },
    { id: 'system', label: 'Sistema', icon: 'monitor' },
  ];
}
