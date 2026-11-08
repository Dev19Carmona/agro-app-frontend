import { Component, computed, inject } from '@angular/core';
import { IconName } from '../../../../shared/ui/icon/icon.types';
import { Menu } from '../../../../shared/ui/menu/menu';
import { MenuItem } from '../../../../shared/ui/menu/menu.types';
import { ThemeService } from '../../services/theme';
import { ThemeMode } from '../../models/theme.types';

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

/** Menú para elegir el tema (claro, oscuro o sistema). Lo usan el header y el layout de auth. */
@Component({
  selector: 'app-theme-menu',
  imports: [Menu],
  template: `
    <app-menu
      label="Tema"
      [icon]="icon()"
      iconOnly
      variant="ghost"
      [items]="items"
      selectable
      [selectedId]="theme.mode()"
      align="end"
      (itemSelect)="onSelect($event)"
    />
  `,
  host: { class: 'inline-flex' },
})
export class ThemeMenu {
  protected readonly theme = inject(ThemeService);
  protected readonly items = THEME_ITEMS;
  protected readonly icon = computed(() => THEME_ICONS[this.theme.mode()]);

  // Los ids vienen de `THEME_ITEMS`; el servicio descarta cualquier otro valor.
  protected onSelect(id: string): void {
    this.theme.setMode(id as ThemeMode);
  }
}
