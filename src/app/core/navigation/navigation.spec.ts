import { TestBed } from '@angular/core/testing';
import { DemoRoleService } from './demo-role';
import { DEMO_ROLE_OPTIONS, NAV_GROUP_ORDER, NAV_ITEMS } from './nav.config';
import { NavigationService } from './navigation';
import { DemoRole } from './navigation.types';
import { ICON_PATHS } from '../../shared/ui/icon/icon-paths';

function groupsFor(role: DemoRole) {
  localStorage.clear();
  const demoRole = TestBed.inject(DemoRoleService);
  demoRole.setRole(role);
  return TestBed.inject(NavigationService)
    .groups()
    .map((g) => ({ name: g.name, labels: g.items.map((i) => i.label) }));
}

describe('NavigationService', () => {
  afterEach(() => localStorage.clear());

  it('VISITANTE: Explorar y Cuenta (iniciar sesión, registrarse)', () => {
    expect(groupsFor('VISITANTE')).toEqual([
      { name: 'Explorar', labels: ['Catálogo', 'Ofertas', 'Tiendas'] },
      { name: 'Cuenta', labels: ['Iniciar sesión', 'Registrarse'] },
    ]);
  });

  it('PRODUCTOR: Explorar, Compras y Cuenta', () => {
    expect(groupsFor('PRODUCTOR')).toEqual([
      { name: 'Explorar', labels: ['Catálogo', 'Ofertas', 'Tiendas'] },
      { name: 'Compras', labels: ['Carrito', 'Pedidos', 'Pagos'] },
      { name: 'Cuenta', labels: ['Mi cuenta'] },
    ]);
  });

  it('PROVEEDOR: Explorar, Mi tienda y Cuenta', () => {
    expect(groupsFor('PROVEEDOR')).toEqual([
      { name: 'Explorar', labels: ['Catálogo', 'Ofertas', 'Tiendas'] },
      { name: 'Mi tienda', labels: ['Mi tienda', 'Productos', 'Pedidos recibidos'] },
      { name: 'Cuenta', labels: ['Mi cuenta'] },
    ]);
  });

  it('ADMIN: Explorar, Administración y Cuenta', () => {
    expect(groupsFor('ADMIN')).toEqual([
      { name: 'Explorar', labels: ['Catálogo', 'Ofertas', 'Tiendas'] },
      {
        name: 'Administración',
        labels: ['Usuarios', 'Categorías', 'Gestión de tiendas', 'Pedidos', 'Pagos'],
      },
      { name: 'Cuenta', labels: ['Mi cuenta'] },
    ]);
  });

  it('se actualiza cuando cambia el rol', () => {
    localStorage.clear();
    const role = TestBed.inject(DemoRoleService);
    const nav = TestBed.inject(NavigationService);
    expect(nav.groups().map((g) => g.name)).not.toContain('Administración');
    role.setRole('ADMIN');
    expect(nav.groups().map((g) => g.name)).toContain('Administración');
  });
});

describe('NAV_ITEMS (configuración)', () => {
  const roles = DEMO_ROLE_OPTIONS.map((o) => o.id);

  it('cada ítem usa un grupo, un rol y un icono que existen', () => {
    for (const item of NAV_ITEMS) {
      expect(NAV_GROUP_ORDER).toContain(item.group);
      expect(item.roles.length).toBeGreaterThan(0);
      for (const role of item.roles) expect(roles).toContain(role);
      expect(Object.keys(ICON_PATHS)).toContain(item.icon);
      expect(item.path.startsWith('/')).toBe(true);
    }
  });

  it.each(roles)('para %s no hay etiquetas ni rutas repetidas', (role) => {
    const visible = NAV_ITEMS.filter((i) => i.roles.includes(role));
    expect(new Set(visible.map((i) => i.label)).size).toBe(visible.length);
    expect(new Set(visible.map((i) => i.path)).size).toBe(visible.length);
  });

  it('todos los roles tienen al menos un ítem', () => {
    for (const role of roles) {
      expect(NAV_ITEMS.some((i) => i.roles.includes(role))).toBe(true);
    }
  });
});
