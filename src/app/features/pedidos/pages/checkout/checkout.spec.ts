import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../../core/auth';
import { CartItem } from '../../../../core/cart';
import { Checkout } from './checkout';

@Component({ template: 'x' })
class Stub {}

function line(variantId: string, patch: Partial<CartItem> = {}): CartItem {
  return {
    variantId,
    cantidad: 2,
    disponible: 20,
    apta: true,
    productId: 'p1',
    storeId: 's1',
    nombreProducto: `Producto ${variantId}`,
    presentacion: 'Bulto',
    unidad: 'kg',
    precioVigente: 1000,
    ...patch,
  };
}

const ORDER = {
  id: 'o1',
  buyerId: 'u1',
  total: 2000,
  moneda: 'COP',
  status: 'PENDING',
  createdAt: '2026-11-09T10:00:00.000Z',
  subOrders: [],
};

describe('Checkout', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'checkout', component: Checkout },
          { path: 'carrito', component: Stub },
          { path: 'pedidos/:id', component: Stub },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionService).start(
      { accessToken: 'a', refreshToken: 'r' },
      { id: 'u1', email: 'a@a.co', nombre: 'Ana', rol: 'PRODUCTOR', status: 'ACTIVE' },
    );
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.match(() => true));

  const root = () => harness.routeNativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const confirmButton = () =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.includes('Confirm')) as
      | HTMLButtonElement
      | undefined;
  const url = () => TestBed.inject(Router).url;

  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function flushCart(items: CartItem[]) {
    await vi.waitFor(() => {
      const open = http.match('/api/orders/cart').filter((r) => r.request.method === 'GET');
      expect(open.length).toBeGreaterThan(0);
      open.forEach((r) => r.flush({ items, total: items.length * 2000 }));
    });
  }
  /** Responde los nombres de tienda que pide la pantalla. */
  async function flushStores(names: Record<string, string | null> = { s1: 'Tienda Verde' }) {
    for (const [id, nombre] of Object.entries(names)) {
      const req = await vi.waitFor(() => http.expectOne(`/api/catalog/stores/${id}`));
      if (nombre) {
        req.flush({ id, nombre, municipio: 'Rionegro' });
      } else {
        req.flush('Error', { status: 500, statusText: 'Server Error' });
      }
    }
  }
  async function open(items: CartItem[], names?: Record<string, string | null>) {
    const nav = harness.navigateByUrl('/checkout', Checkout);
    await flushCart(items);
    await nav;
    if (items.length) {
      await flushStores(names);
    }
    await settle();
  }

  it('muestra el resumen por tienda con su nombre y el total', async () => {
    await open([line('v1'), line('v2')]);
    expect(text()).toContain('Tienda Verde');
    expect(text()).toContain('Producto v1');
    expect(text()).toContain('$ 4.000');
    expect(confirmButton()?.disabled).toBe(false);
  });

  it('si falla el nombre de la tienda usa "Tienda"', async () => {
    await open([line('v1')], { s1: null });
    expect(root().querySelector('h2')?.textContent?.trim()).toBe('Tienda');
    expect(text()).toContain('Producto v1');
  });

  it('con el carrito vacío redirige a /carrito', async () => {
    const nav = harness.navigateByUrl('/checkout', Checkout);
    await flushCart([]);
    await nav;
    await vi.waitFor(() => expect(url()).toBe('/carrito'));
  });

  it('Confirmar envía POST con una Idempotency-Key de 8 a 100 caracteres y navega al pedido', async () => {
    await open([line('v1')]);
    confirmButton()?.click();
    const post = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    const key = post.request.headers.get('Idempotency-Key') ?? '';
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(100);
    post.flush(ORDER, { status: 201, statusText: 'Created' });
    await vi.waitFor(() => expect(url()).toBe('/pedidos/o1'));
    const cart = TestBed.inject(SessionService);
    expect(cart.isAuthenticated()).toBe(true);
  });

  it('queda deshabilitado durante el envío y un doble clic no genera dos pedidos', async () => {
    await open([line('v1')]);
    confirmButton()?.click();
    confirmButton()?.click();
    harness.detectChanges();
    expect(confirmButton()?.disabled).toBe(true);
    const posts = await vi.waitFor(() => http.match('/api/orders/checkout'));
    expect(posts.length).toBe(1);
    posts[0].flush(ORDER, { status: 201, statusText: 'Created' });
  });

  it('tras un error de red reintenta con la misma Idempotency-Key', async () => {
    await open([line('v1')]);
    confirmButton()?.click();
    const first = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    confirmButton()?.click();
    const second = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush(ORDER, { status: 200, statusText: 'OK' });
  });

  it('si el carrito cambia entre intentos usa una clave nueva', async () => {
    await open([line('v1')]);
    confirmButton()?.click();
    const first = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    await settle();
    // Otra pestaña cambió la cantidad: el recargado trae un carrito distinto.
    void TestBed.inject(SessionService);
    const cart = (await import('../../../../core/cart')).CartService;
    const service = TestBed.inject(cart);
    const reload = service.load();
    await flushCart([line('v1', { cantidad: 5 })]);
    await reload;
    await settle();
    confirmButton()?.click();
    const second = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    expect(second.request.headers.get('Idempotency-Key')).not.toBe(key);
    second.flush(ORDER, { status: 201, statusText: 'Created' });
  });

  it('un 400 con líneas marca las inválidas y ofrece quitarlas', async () => {
    await open([line('v1'), line('v2')]);
    confirmButton()?.click();
    const post = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    post.flush(
      {
        message: 'El carrito tiene líneas que no se pueden comprar',
        lineas: [{ variantId: 'v2', motivo: 'NOT_APTA' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await flushCart([line('v1'), line('v2', { apta: false })]);
    await settle();
    expect(text()).toContain('El carrito tiene líneas que no se pueden comprar');
    expect(text()).toContain('No se puede comprar');
    expect(confirmButton()?.disabled).toBe(true);

    [...root().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Quitar líneas no válidas'))
      ?.click();
    const del = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v2'));
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await flushCart([line('v1')]);
    await settle();
    expect(text()).not.toContain('No se puede comprar');
    expect(confirmButton()?.disabled).toBe(false);
  });

  it('un 400 de carrito vacío muestra el mensaje del backend', async () => {
    await open([line('v1')]);
    confirmButton()?.click();
    const post = await vi.waitFor(() => http.expectOne('/api/orders/checkout'));
    post.flush({ message: 'El carrito está vacío' }, { status: 400, statusText: 'Bad Request' });
    await settle();
    expect(text()).toContain('El carrito está vacío');
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const nav = harness.navigateByUrl('/checkout', Checkout);
    await vi.waitFor(() => {
      const open = http.match('/api/orders/cart');
      expect(open.length).toBeGreaterThan(0);
      open.forEach((r) => r.error(new ProgressEvent('error')));
    });
    await nav;
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(
      [...root().querySelectorAll('button')].some((b) => b.textContent?.includes('Reintentar')),
    ).toBe(true);
  });
});
