import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../../core/auth';
import { CartItem } from '../../../../core/cart';
import { Carrito } from './carrito';

function line(variantId: string, cantidad: number, patch: Partial<CartItem> = {}): CartItem {
  return {
    variantId,
    cantidad,
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

describe('Carrito', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'carrito', component: Carrito },
          { path: 'checkout', component: Carrito },
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
  const button = (label: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as
      | HTMLButtonElement
      | undefined;

  /** El servicio y la página piden el carrito: se responden todas las peticiones abiertas. */
  async function flushCart(items: CartItem[]) {
    await vi.waitFor(() => {
      const open = http.match('/api/orders/cart').filter((r) => r.request.method === 'GET');
      expect(open.length).toBeGreaterThan(0);
      open.forEach((r) => r.flush({ items, total: items.filter((i) => i.apta).length * 1000 }));
    });
    await settle();
  }
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function open(items: CartItem[]) {
    const nav = harness.navigateByUrl('/carrito', Carrito);
    await flushCart(items);
    await nav;
    harness.detectChanges();
  }

  it('muestra las líneas con producto, presentación, precio, cantidad y el total', async () => {
    await open([line('v1', 2), line('v2', 1)]);
    expect(text()).toContain('Producto v1');
    expect(text()).toContain('Bulto');
    expect(text()).toContain('$ 1.000');
    expect(text()).toContain('$ 2.000');
    expect(root().querySelectorAll('input[type="number"]').length).toBe(2);
    expect(button('Continuar')?.disabled).toBe(false);
  });

  it('con el carrito vacío muestra el estado vacío con enlace al catálogo', async () => {
    await open([]);
    expect(text()).toContain('Tu carrito está vacío');
    expect(root().querySelector('a[href="/catalogo"]')).not.toBeNull();
    expect(button('Continuar')).toBeUndefined();
  });

  it('cambiar la cantidad envía el valor absoluto y recarga', async () => {
    await open([line('v1', 2)]);
    const input = root().querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '7';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const put = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v1'));
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ cantidad: 7 });
    put.flush({ variantId: 'v1', cantidad: 7 });
    await flushCart([line('v1', 7)]);
    expect(text()).toContain('$ 7.000');
  });

  it('una cantidad inválida no se envía y muestra el error', async () => {
    await open([line('v1', 2)]);
    const input = root().querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
    http.expectNone('/api/orders/cart/items/v1');
    expect(text()).toContain('entero entre 1 y 1000');
  });

  it('Quitar llama al backend y deja el carrito vacío', async () => {
    await open([line('v1', 2)]);
    button('Quitar')?.click();
    const del = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v1'));
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await flushCart([]);
    expect(text()).toContain('Tu carrito está vacío');
  });

  it('Vaciar carrito llama a DELETE /orders/cart', async () => {
    await open([line('v1', 2), line('v2', 1)]);
    button('Vaciar carrito')?.click();
    const del = await vi.waitFor(() =>
      http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/orders/cart'),
    );
    del.flush(null, { status: 204, statusText: 'No Content' });
    await flushCart([]);
    expect(text()).toContain('Tu carrito está vacío');
  });

  it('una línea no apta se marca y deshabilita Continuar', async () => {
    await open([line('v1', 2), line('v2', 1, { apta: false })]);
    expect(text()).toContain('No disponible');
    expect(text()).toContain('Quítalas para continuar');
    expect(button('Continuar')?.disabled).toBe(true);
  });

  it('Continuar navega a /checkout', async () => {
    await open([line('v1', 2)]);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    button('Continuar')?.click();
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });

  it('un error de acción del backend se muestra en un aviso', async () => {
    await open([line('v1', 2)]);
    button('Quitar')?.click();
    const del = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v1'));
    del.flush({ message: 'No se pudo quitar' }, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(text()).toContain('No se pudo quitar');
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const nav = harness.navigateByUrl('/carrito', Carrito);
    await vi.waitFor(() => {
      const open = http.match('/api/orders/cart');
      expect(open.length).toBeGreaterThan(0);
      open.forEach((r) => r.error(new ProgressEvent('error')));
    });
    await nav;
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(button('Reintentar')).toBeDefined();
    button('Reintentar')?.click();
    await flushCart([line('v1', 1)]);
    expect(text()).toContain('Producto v1');
  });
});
