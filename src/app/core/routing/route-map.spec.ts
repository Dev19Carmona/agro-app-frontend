import { Route, Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { accessGuard } from '../auth/access.guard';
import { SessionRole } from '../auth/auth.types';
import { NAV_ITEMS } from '../navigation/nav.config';
import { RouteInfo } from '../navigation/navigation.types';

interface Leaf {
  path: string;
  route: Route;
}

/** Recorre el árbol de rutas (cargando los `loadChildren`) y devuelve las pantallas finales. */
async function collectLeaves(tree: Routes, prefix = ''): Promise<Leaf[]> {
  const leaves: Leaf[] = [];
  for (const route of tree) {
    if (route.redirectTo !== undefined || route.path === '**') {
      continue;
    }
    const path = [prefix, route.path].filter(Boolean).join('/');
    if (route.loadChildren) {
      const children = (await route.loadChildren()) as unknown as Routes;
      leaves.push(...(await collectLeaves(children, path)));
    } else if (route.children) {
      leaves.push(...(await collectLeaves(route.children, path)));
    } else {
      leaves.push({ path: `/${path}`, route });
    }
  }
  return leaves;
}

/** Mapa de rutas de SPEC 02 ("Mapa de rutas"): las 30 pantallas de negocio. */
const SPEC_ROUTES = [
  '/catalogo',
  '/catalogo/productos/:id',
  '/catalogo/ofertas',
  '/catalogo/tiendas',
  '/catalogo/tiendas/:id',
  '/auth/login',
  '/auth/registro',
  '/cuenta',
  '/carrito',
  '/checkout',
  '/pedidos',
  '/pedidos/:id',
  '/pedidos/:id/pago',
  '/pagos',
  '/pagos/:id',
  '/proveedor/tienda',
  '/proveedor/productos',
  '/proveedor/productos/nuevo',
  '/proveedor/productos/:id',
  '/proveedor/pedidos',
  '/proveedor/pedidos/:id',
  '/admin/usuarios',
  '/admin/usuarios/:id',
  '/admin/categorias',
  '/admin/tiendas',
  '/admin/tiendas/:id',
  '/admin/pedidos',
  '/admin/pedidos/:id',
  '/admin/pagos',
  '/admin/pagos/:id',
];

describe('Mapa de rutas', () => {
  let all: Leaf[];
  let screens: Leaf[];

  beforeAll(async () => {
    all = await collectLeaves(routes);
    // `/acceso-denegado` y las demos `/ui/*` no son pantallas del mapa de negocio.
    screens = all.filter(
      (leaf) => !leaf.path.startsWith('/ui/') && leaf.path !== '/acceso-denegado',
    );
  });

  it('contiene exactamente las pantallas del mapa de SPEC 02, sin repetidas', () => {
    const paths = screens.map((leaf) => leaf.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect([...paths].sort()).toEqual([...SPEC_ROUTES].sort());
  });

  it('cada pantalla tiene título, descripción, roles y endpoints', () => {
    for (const { path, route } of screens) {
      const info = route.data as RouteInfo | undefined;
      expect(route.title, `${path}: title`).toEqual(expect.any(String));
      expect(route.title, `${path}: title`).not.toBe('');
      expect(info?.description, `${path}: description`).toEqual(expect.any(String));
      expect(info?.roles?.length, `${path}: roles`).toBeGreaterThan(0);
      expect(info?.endpoints?.length, `${path}: endpoints`).toBeGreaterThan(0);
    }
  });

  it('los endpoints tienen el formato "MÉTODO /ruta"', () => {
    for (const { path, route } of screens) {
      for (const endpoint of (route.data as RouteInfo).endpoints) {
        expect(endpoint, `${path}`).toMatch(/^(GET|POST|PUT|PATCH|DELETE) \/[\w\-/:]+/);
      }
    }
  });

  it('todas las pantallas son lazy (loadComponent) y el guard va en los layouts, no en cada ruta', () => {
    for (const { path, route } of all) {
      expect(typeof route.loadComponent, `${path}: loadComponent`).toBe('function');
      expect(route.component, `${path}: sin component síncrono`).toBeUndefined();
      expect(
        route.canActivate,
        `${path}: el guard va en el layout (canActivateChild)`,
      ).toBeUndefined();
    }
  });

  it('cada ítem del panel apunta a una ruta que existe y su rol la puede ver', () => {
    const byPath = new Map(screens.map((leaf) => [leaf.path, leaf.route]));
    for (const item of NAV_ITEMS) {
      const route = byPath.get(item.path);
      expect(route, `${item.label}: ${item.path} no existe`).toBeDefined();
      const routeRoles = (route!.data as RouteInfo).roles;
      for (const role of item.roles) {
        expect(routeRoles, `${item.label}: ${role} no está en los roles de ${item.path}`).toContain(
          role,
        );
      }
    }
  });

  it('toda pantalla de nivel superior tiene entrada en el panel, salvo checkout', () => {
    // Una pantalla sin enlace en el panel solo sería alcanzable por URL. Se admiten las que
    // cuelgan de otra (detalle, alta, edición, pago): llevan parámetro, "nuevo" o "pago".
    const linked = new Set(NAV_ITEMS.map((item) => item.path));
    const orphans = screens
      .filter(
        ({ path }) => !path.includes(':') && !path.endsWith('/nuevo') && !path.endsWith('/pago'),
      )
      .filter(({ path }) => !linked.has(path))
      .map(({ path }) => path);
    // /checkout se alcanza desde el carrito.
    expect(orphans).toEqual(['/checkout']);
  });

  it('lista las pantallas que aún usan el placeholder (SPEC 04 las irá sustituyendo)', () => {
    const pending = screens
      .filter(({ route }) => String(route.loadComponent).includes('route-placeholder'))
      .map(({ path }) => path);
    console.info(`Pantallas con placeholder: ${pending.length} de ${screens.length}`);
    // A medida que SPEC 04 las maqueta este número baja a 0.
    expect(pending.length).toBeLessThanOrEqual(screens.length);
    expect(pending.every((path) => SPEC_ROUTES.includes(path))).toBe(true);
  });
  it('los roles de cada pantalla son valores de SessionRole', () => {
    const valid: SessionRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];
    for (const { path, route } of screens) {
      for (const role of (route.data as RouteInfo).roles) {
        expect(valid, `${path}: rol ${role}`).toContain(role);
      }
    }
  });

  it('solo login y registro son rutas de invitado; las privadas no incluyen VISITANTE', () => {
    const guest = screens
      .filter(({ route }) => {
        const roles = (route.data as RouteInfo).roles;
        return roles.length === 1 && roles[0] === 'VISITANTE';
      })
      .map(({ path }) => path);
    expect(guest.sort()).toEqual(['/auth/login', '/auth/registro']);
  });

  it('los dos layouts (auth y shell) aplican accessGuard con canActivateChild', () => {
    const layouts = routes.filter((route) => route.canActivateChild);
    expect(layouts.map((route) => route.path)).toEqual(['auth', '']);
    for (const layout of layouts) {
      expect(layout.canActivateChild).toEqual([accessGuard]);
    }
  });
});
