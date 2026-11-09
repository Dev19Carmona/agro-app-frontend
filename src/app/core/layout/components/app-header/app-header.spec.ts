import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppRole, SessionService } from '../../../auth';
import { AppHeader } from './app-header';

function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(AppHeader);
  const session = TestBed.inject(SessionService);
  const http = TestBed.inject(HttpTestingController);
  const el = fixture.nativeElement as HTMLElement;
  const cartLink = () => el.querySelector<HTMLAnchorElement>('a[href="/carrito"]');
  const signIn = async (rol: AppRole, lines = 0) => {
    session.start(
      { accessToken: 'a', refreshToken: 'r' },
      { id: '1', email: 'ana@agro.test', nombre: 'Ana', rol, status: 'ACTIVE' },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    if (rol === 'PRODUCTOR') {
      const items = Array.from({ length: lines }, (_, i) => ({
        variantId: `v${i}`,
        cantidad: 1,
        disponible: 5,
        apta: true,
      }));
      http.expectOne('/api/orders/cart').flush({ items, total: 0 });
      await fixture.whenStable();
    }
    fixture.detectChanges();
  };
  fixture.detectChanges();
  return { fixture, el, cartLink, signIn, http };
}

describe('AppHeader · carrito', () => {
  afterEach(() => localStorage.clear());

  it('no muestra el carrito al visitante', () => {
    expect(setup().cartLink()).toBeNull();
  });

  it('no muestra el carrito al proveedor ni al administrador', async () => {
    const proveedor = setup();
    await proveedor.signIn('PROVEEDOR');
    expect(proveedor.cartLink()).toBeNull();
  });

  it('muestra el enlace al productor con el número de líneas y su aria-label', async () => {
    const ctx = setup();
    await ctx.signIn('PRODUCTOR', 3);
    const link = ctx.cartLink();
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label')).toBe('Carrito, 3 líneas');
    expect(link?.textContent?.trim()).toBe('3');
  });

  it('con una línea usa el singular y con el carrito vacío no muestra número', async () => {
    const one = setup();
    await one.signIn('PRODUCTOR', 1);
    expect(one.cartLink()?.getAttribute('aria-label')).toBe('Carrito, 1 línea');
    TestBed.resetTestingModule();
    const empty = setup();
    await empty.signIn('PRODUCTOR', 0);
    expect(empty.cartLink()?.textContent?.trim()).toBe('');
    expect(empty.cartLink()?.getAttribute('aria-label')).toBe('Carrito, 0 líneas');
  });
});

describe('AppHeader · campana de notificaciones', () => {
  afterEach(() => localStorage.clear());
  const bell = (el: HTMLElement) => el.querySelector('app-notification-bell');

  it('no la muestra al visitante', () => {
    expect(bell(setup().el)).toBeNull();
  });

  it('no la muestra al administrador', async () => {
    const ctx = await (async () => {
      const c = setup();
      await c.signIn('ADMIN');
      return c;
    })();
    expect(bell(ctx.el)).toBeNull();
  });

  it('la muestra al productor y al proveedor', async () => {
    const productor = setup();
    await productor.signIn('PRODUCTOR');
    expect(bell(productor.el)).not.toBeNull();
    TestBed.resetTestingModule();
    const proveedor = setup();
    await proveedor.signIn('PROVEEDOR');
    expect(bell(proveedor.el)).not.toBeNull();
  });
});
