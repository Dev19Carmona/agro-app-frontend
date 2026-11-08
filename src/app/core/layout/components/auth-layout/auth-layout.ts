import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ThemeMenu } from '../../../theme';

/**
 * Layout de las pantallas de acceso (login y registro): sin header ni panel, contenido centrado
 * a pantalla completa. Conserva el selector de tema, que además aplica el tema al documento.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, Icon, ThemeMenu],
  template: `
    <div class="flex min-h-dvh flex-col px-4 py-4 sm:py-6">
      <header class="mx-auto flex w-full max-w-md items-center justify-between">
        <a
          routerLink="/catalogo"
          aria-label="Mini-Croper, ir al catálogo"
          class="flex items-center gap-3 rounded-pill text-fg no-underline"
        >
          <span
            class="inline-flex size-10 items-center justify-center rounded-pill bg-brand text-on-brand"
          >
            <app-icon name="leaf" />
          </span>
          <span class="font-serif text-xl" aria-hidden="true">Mini-Croper</span>
        </a>
        <app-theme-menu />
      </header>

      <main
        id="main-content"
        tabindex="-1"
        class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 outline-none"
      >
        <router-outlet />
      </main>
    </div>
  `,
  host: { class: 'block' },
})
export class AuthLayout {}
