import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { PageTitleStrategy } from './page-title.strategy';

async function go(url: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: TitleStrategy, useClass: PageTitleStrategy }],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  const el = harness.routeNativeElement as HTMLElement;
  return {
    el,
    router: TestBed.inject(Router),
    h1: el.querySelector('h1')?.textContent?.trim(),
    badges: Array.from(el.querySelectorAll('app-badge')).map((b) => b.textContent?.trim()),
    codes: Array.from(el.querySelectorAll('code')).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()),
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
    const { h1, badges, codes, title, el } = await go('/admin/usuarios/7');
    expect(h1).toBe('Detalle de usuario');
    expect(badges).toEqual(['Administrador']);
    expect(codes).toContain('POST /auth/users/:id/approve');
    expect(codes).toContain('id = 7');
    expect(el.textContent).toContain('Aprobar o rechazar a un proveedor pendiente');
    expect(title).toBe('Detalle de usuario · Mini-Croper');
  });

  it('productos/nuevo no se confunde con productos/:id', async () => {
    const { h1, codes } = await go('/proveedor/productos/nuevo');
    expect(h1).toBe('Nuevo producto');
    expect(codes).toEqual(['POST /catalog/products']);
  });

  it.each([
    ['/carrito', 'Carrito'],
    ['/checkout', 'Confirmar pedido'],
    ['/pedidos', 'Mis pedidos'],
    ['/pedidos/5', 'Detalle de pedido'],
    ['/pedidos/5/pago', 'Pagar pedido'],
    ['/pagos', 'Mis pagos'],
    ['/pagos/9', 'Detalle de pago'],
    ['/cuenta', 'Mi cuenta'],
    ['/auth/login', 'Iniciar sesión'],
    ['/auth/registro', 'Crear cuenta'],
    ['/proveedor/tienda', 'Mi tienda'],
    ['/admin/pagos', 'Pagos (admin)'],
  ])('%s carga su pantalla "%s"', async (url, title) => {
    const { h1, title: docTitle } = await go(url);
    expect(h1).toBe(title);
    expect(docTitle).toBe(`${title} · Mini-Croper`);
  });

  it('una URL inexistente muestra la 404 con enlace al catálogo', async () => {
    const { h1, title, el } = await go('/esto/no/existe');
    expect(h1).toBe('No encontramos esta página');
    expect(title).toBe('Página no encontrada · Mini-Croper');
    expect(el.querySelector('a[href="/catalogo"]')).not.toBeNull();
  });

  it('las rutas de rol son accesibles por URL con cualquier rol de demo (sin guards)', async () => {
    localStorage.clear();
    const { h1 } = await go('/admin/usuarios');
    expect(h1).toBe('Usuarios');
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
