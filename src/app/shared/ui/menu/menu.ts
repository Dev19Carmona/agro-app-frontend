import {
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icon.types';
import { MenuAlign, MenuItem, MenuTriggerSize, MenuTriggerVariant } from './menu.types';

/**
 * Menú desplegable: un botón que abre una lista de acciones o de opciones.
 *
 * ```html
 * <app-menu label="Rol" [items]="roles" selectable [selectedId]="role()" (itemSelect)="role.set($event)" />
 * ```
 *
 * - Sin `selectable`, los ítems son acciones (`role="menuitem"`).
 * - Con `selectable`, son opciones excluyentes (`role="menuitemradio"`) y `selectedId` marca la
 *   actual con `aria-checked` y un check.
 * - Con `iconOnly`, el botón solo muestra `icon` y `label` pasa a ser su `aria-label`.
 *
 * Valores por defecto: `icon=null`, `iconOnly=false`, `variant='secondary'`, `size='md'`,
 * `align='start'`, `selectable=false`, `selectedId=null`, `ariaLabel=null`.
 */
@Component({
  selector: 'app-menu',
  imports: [MatMenu, MatMenuItem, MatMenuTrigger, Button, Icon],
  encapsulation: ViewEncapsulation.None,
  styles: `
    /* El panel del menú vive en el overlay, fuera del componente: por eso va sin encapsular. */
    .mat-mdc-menu-panel.app-menu-panel {
      --mat-menu-container-shape: var(--radius-lg);
      --mat-menu-container-color: var(--c-surface);
      border: 1px solid var(--c-line);
      min-width: 12rem;
    }
  `,
  template: `
    <button
      app-button
      [variant]="variant()"
      [size]="size()"
      [iconOnly]="iconOnly()"
      [ariaLabel]="iconOnly() ? label() : ariaLabel()"
      [matMenuTriggerFor]="menu"
    >
      @if (icon(); as name) {
        <app-icon [name]="name" size="sm" />
      }
      @if (!iconOnly()) {
        {{ label() }}
        <app-icon name="chevron-down" size="sm" />
      }
    </button>

    <mat-menu
      #menu="matMenu"
      class="app-menu-panel"
      [xPosition]="xPosition()"
      [aria-label]="label()"
    >
      @for (item of items(); track item.id) {
        @if (item.dividerBefore) {
          <div role="separator" class="my-1 h-px bg-line"></div>
        }
        <button
          mat-menu-item
          [role]="selectable() ? 'menuitemradio' : 'menuitem'"
          [attr.aria-checked]="selectable() ? item.id === selectedId() : null"
          [disabled]="item.disabled ?? false"
          (click)="itemSelect.emit(item.id)"
        >
          @if (item.icon) {
            <app-icon matMenuItemIcon [name]="item.icon" size="sm" />
          }
          <span class="flex items-center justify-between gap-3">
            {{ item.label }}
            @if (selectable() && item.id === selectedId()) {
              <app-icon name="check" size="sm" />
            }
          </span>
        </button>
      }
    </mat-menu>
  `,
  host: { class: 'inline-flex' },
})
export class Menu {
  readonly items = input.required<MenuItem[]>();
  readonly label = input.required<string>();
  readonly icon = input<IconName | null>(null);
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly variant = input<MenuTriggerVariant>('secondary');
  readonly size = input<MenuTriggerSize>('md');
  readonly align = input<MenuAlign>('start');
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selectedId = input<string | null>(null);
  /**
   * Nombre accesible del botón cuando muestra texto y el texto solo no basta (p. ej. el botón
   * dice «Productor» y el nombre es «Rol de demo: Productor»). Debe contener el texto visible.
   * Con `iconOnly` se ignora y se usa `label`.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Emite el `id` del ítem elegido por el usuario. */
  readonly itemSelect = output<string>();

  protected readonly xPosition = computed(() => (this.align() === 'end' ? 'before' : 'after'));
}
