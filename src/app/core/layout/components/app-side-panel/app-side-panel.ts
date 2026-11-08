import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavigationService } from '../../../navigation';
import { Icon } from '../../../../shared/ui/icon/icon';

let nextId = 0;

/**
 * Navegación principal agrupada según el rol de la sesión. Se usa tanto en el panel fijo de pantallas
 * grandes como dentro del drawer en pantallas pequeñas; `navigated` avisa al elegir un enlace
 * para que el drawer se cierre.
 */
@Component({
  selector: 'app-side-panel',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav aria-label="Navegación principal" class="flex flex-col gap-5">
      @for (group of navigation.groups(); track group.name; let i = $index) {
        <div class="flex flex-col gap-1">
          <p [id]="uid + '-' + i" class="px-3 text-sm font-semibold text-fg-muted">
            {{ group.name }}
          </p>
          <ul class="flex flex-col gap-0.5" [attr.aria-labelledby]="uid + '-' + i">
            @for (item of group.items; track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-brand-soft font-semibold text-brand-text"
                  ariaCurrentWhenActive="page"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  class="flex items-center gap-3 rounded-md px-3 py-2.5 text-fg no-underline hover:bg-sunken"
                  (click)="navigated.emit()"
                >
                  <app-icon [name]="item.icon" />
                  {{ item.label }}
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
  host: { class: 'block' },
})
export class AppSidePanel {
  protected readonly navigation = inject(NavigationService);
  /** Prefijo único de ids: hay dos instancias a la vez (panel fijo y drawer). */
  protected readonly uid = `nav-group-${nextId++}`;

  /** Se emite al elegir un enlace. */
  readonly navigated = output<void>();
}
