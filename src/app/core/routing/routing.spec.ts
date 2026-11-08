import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AppRole, SessionRole } from '../auth';
import { SessionService } from '../auth';
import { PageTitleStrategy } from './services/page-title.strategy';

/** Navega a `url` con la sesión de `role` (`VISITANTE` = sin sesión). */
async function go(url: string, role: SessionRole = 'VISITANTE') {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: TitleStrategy, useClass: PageTitleStrategy }],
  });
  if (role !== 'VISITANTE') {
    TestBed.inject(SessionService).start(
      { accessToken: 'a', refreshToken: 'r' },
      { id: '1', email: 'a@agro.test', nombre: 'A', rol: role, status: 'ACTIVE' },
    );
  }
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  const el = harness.routeNativeElement as HTMLElement;
  return {
    el,
    router: TestBed.inject(Router),
    h1: el.querySelector('h1')?.textContent?.trim(),
    badges: Array.from(el.querySelectorAll('app-badge')).map((b) => b.textContent?.trim()),
    codes: Array.from(el.querySelectorAll('code')).map((c) =>
      c.textContent?.replace(/\s+/g, ' ').trim(),
    ),
    title: TestBed.inject(Title).getTitle(),
  };
}

describe('Árbol de rutas', () => {
  it('la raíz redirige a /catalogo', async () => {
    const { router, h1 } = await go('/');
    expect(router.url).toBe('/catalogo');
    expect(h1).toBe('Catálogo');
  });

  it('una ruta pública muestra "Todos" como rol y no tiene parámetros', async () => {
    const { badges, el } = await go('/catalogo');
    expect(badges).toEqual(['Todos']);
    expect(el.textContent).not.toContain('Parámetros de la ruta');
  });

  it('muestra título, rol, descripción y endpoints de una ruta con parámetro', async () => {
    const { h1, badges, codes, title, el } = await go('/admin/usuarios/7', 'ADMIN');
    expect(h1).toBe('Detalle de usuario');
    expect(badges).toEqual(['Administrador']);
    expect(codes).toContain('POST /auth/users/:id/approve');
    expect(codes).toContain('id = 7');
    expect(el.textContent).toContain('Aprobar o rechazar a un proveedor pendiente');
    expect(title).toBe('Detalle de usuario · Mini-Croper');
  });

  it('productos/nuevo no se confunde con productos/:id', async () => {
    const { h1, codes } = await go('/proveedor/productos/nuevo', 'PROVEEDOR');
    expect(h1).toBe('Nuevo producto');
    expect(codes).toEqual(['POST /catalog/products']);
  });

  it.each<[string, string, SessionRole]>([
    ['/carrito', 'Carrito', 'PRODUCTOR'],
    ['/checkout', 'Confirmar pedido', 'PRODUCTOR'],
    ['/pedidos', 'Mis pedidos', 'PRODUCTOR'],
    ['/pedidos/5', 'Detalle de pedido', 'PRODUCTOR'],
    ['/pedidos/5/pago', 'Pagar pedido', 'PRODUCTOR'],
    ['/pagos', 'Mis pagos', 'PRODUCTOR'],
    ['/pagos/9', 'Detalle de pago', 'PRODUCTOR'],
    ['/cuenta', 'Mi cuenta', 'PRODUCTOR'],
    ['/auth/login', 'Iniciar sesión', 'VISITANTE'],
    ['/auth/registro', 'Crear cuenta', 'VISITANTE'],
    ['/proveedor/tienda', 'Mi tienda', 'PROVEEDOR'],
    ['/admin/pagos', 'Pagos (admin)', 'ADMIN'],
  ])('%s carga su pantalla "%s"', async (url, title, role) => {
    const { h1, title: docTitle } = await go(url, role);
    expect(h1).toBe(title);
    expect(docTitle).toBe(`${title} · Mini-Croper`);
  });

  it.each(['/auth/login', '/auth/registro'])(
    '%s se muestra sin header ni panel (AuthLayout)',
    async (url) => {
      const { el } = await go(url);
      expect(el.querySelector('app-auth-layout main h1')).not.toBeNull();
      expect(el.querySelector('app-header')).toBeNull();
      expect(el.querySelector('aside')).toBeNull();
    },
  );

  it('el resto de rutas siguen dentro del shell', async () => {
    const { el } = await go('/catalogo');
    expect(el.querySelector('app-shell app-header')).not.toBeNull();
    expect(el.querySelector('app-shell aside')).not.toBeNull();
    expect(el.querySelector('app-auth-layout')).toBeNull();
  });

  it('una URL inexistente muestra la 404 con enlace al catálogo', async () => {
    const { h1, title, el } = await go('/esto/no/existe');
    expect(h1).toBe('No encontramos esta página');
    expect(title).toBe('Página no encontrada · Mini-Croper');
    expect(el.querySelector('a[href="/catalogo"]')).not.toBeNull();
  });

  it.each(['/carrito', '/cuenta', '/admin/usuarios'])(
    'un visitante que abre %s va a login con returnUrl',
    async (url) => {
      const { router } = await go(url);
      expect(router.url).toBe(`/auth/login?returnUrl=${encodeURIComponent(url)}`);
    },
  );

  it.each<[string, AppRole]>([
    ['/admin/usuarios', 'PRODUCTOR'],
    ['/proveedor/productos', 'PRODUCTOR'],
    ['/carrito', 'PROVEEDOR'],
  ])('%s con rol %s muestra /acceso-denegado', async (url, role) => {
    const { router, h1, title } = await go(url, role);
    expect(router.url).toBe('/acceso-denegado');
    expect(h1).toBe('Acceso denegado');
    expect(title).toBe('Acceso denegado · Mini-Croper');
  });

  it.each(['/auth/login', '/auth/registro'])('con sesión, %s redirige a /catalogo', async (url) => {
    const { router } = await go(url, 'PRODUCTOR');
    expect(router.url).toBe('/catalogo');
  });

  it('el catálogo es público para un visitante', async () => {
    for (const url of ['/catalogo', '/catalogo/ofertas', '/catalogo/tiendas']) {
      const { router } = await go(url);
      expect(router.url).toBe(url);
      TestBed.resetTestingModule();
    }
  });

  it('las demos /ui/* siguen disponibles', async () => {
    const { h1 } = await go('/ui/button');
    expect(h1).toContain('Button');
  });
});

describe('PageTitleStrategy', () => {
  it('sin título de ruta usa solo el nombre de la app', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sin-titulo', children: [] }]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sin-titulo');
    expect(TestBed.inject(Title).getTitle()).toBe('Mini-Croper');
  });
});
