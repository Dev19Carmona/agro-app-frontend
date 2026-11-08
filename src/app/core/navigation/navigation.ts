import { Service, computed, inject } from '@angular/core';
import { DemoRoleService } from './demo-role';
import { NAV_GROUP_ORDER, NAV_ITEMS } from './nav.config';
import { NavGroup } from './navigation.types';

/**
 * Ítems del panel de navegación que ve el rol de demo actual, agrupados y en el orden de
 * `NAV_GROUP_ORDER`. Los grupos sin ítems no aparecen.
 */
@Service()
export class NavigationService {
  private readonly demoRole = inject(DemoRoleService);

  readonly groups = computed<NavGroup[]>(() => {
    const role = this.demoRole.role();
    const visible = NAV_ITEMS.filter((navItem) => navItem.roles.includes(role));
    return NAV_GROUP_ORDER.map((name) => ({
      name,
      items: visible.filter((navItem) => navItem.group === name),
    })).filter((group) => group.items.length > 0);
  });
}
