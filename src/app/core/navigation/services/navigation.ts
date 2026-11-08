import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../auth';
import { NAV_GROUP_ORDER, NAV_ITEMS } from '../config/nav.config';
import { NavGroup } from '../models/navigation.types';

/**
 * Ítems del panel de navegación que ve el rol de la sesión actual, agrupados y en el orden de
 * `NAV_GROUP_ORDER`. Los grupos sin ítems no aparecen.
 */
@Service()
export class NavigationService {
  private readonly session = inject(SessionService);

  readonly groups = computed<NavGroup[]>(() => {
    const role = this.session.role();
    const visible = NAV_ITEMS.filter((navItem) => navItem.roles.includes(role));
    return NAV_GROUP_ORDER.map((name) => ({
      name,
      items: visible.filter((navItem) => navItem.group === name),
    })).filter((group) => group.items.length > 0);
  });
}
