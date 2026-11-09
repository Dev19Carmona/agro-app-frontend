import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthUser, SessionService } from '../../auth';
import { CartItem } from '../models/cart.types';
import { CartService } from './cart';

const USER: AuthUser = {
  id: 'u1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PRODUCTOR',
  status: 'ACTIVE',
};
const TOKENS = { accessToken: 'a', refreshToken: 'r' };

function line(variantId: string, cantidad: number): CartItem {
  return {
    variantId,
    cantidad,
    disponible: 50,
    apta: true,
    productId: 'p1',
    storeId: 's1',
    nombreProducto: 'Abono',
    presentacion: 'Bulto',
    unidad: 'kg',
    precioVigente: 1000,
  };
}

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const session = TestBed.inject(SessionService);
  const cart = TestBed.inject(CartService);
  return { http, session, cart };
}

/** Inicia sesión y deja que el efecto pida el carrito. */
async function loginAs(
  ctx: ReturnType<typeof setup>,
  items: CartItem[] = [],
  user: AuthUser = USER,
) {
  ctx.session.start(TOKENS, user);
  TestBed.tick();
  ctx.http.expectOne('/api/orders/cart').flush({ items, total: items.length * 1000 });
  await Promise.resolve();
  await Promise.resolve();
}

async function flushAsync() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('CartService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('no pide el carrito a un visitante', () => {
    const { http, cart } = setup();
    TestBed.tick();
    http.expectNone('/api/orders/cart');
    expect(cart.status()).toBe('idle');
  });

  it('carga el carrito al quedar la sesión como PRODUCTOR', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 2), line('v2', 1)]);
    expect(ctx.cart.status()).toBe('ready');
    expect(ctx.cart.count()).toBe(2);
    expect(ctx.cart.total()).toBe(2000);
  });

  it('no carga el carrito de un proveedor', () => {
    const ctx = setup();
    ctx.session.start(TOKENS, { ...USER, rol: 'PROVEEDOR' });
    TestBed.tick();
    ctx.http.expectNone('/api/orders/cart');
    expect(ctx.cart.count()).toBe(0);
  });

  it('add suma a la cantidad existente y recarga el carrito', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 3)]);
    const result = ctx.cart.add('v1', 2);
    await flushAsync();
    const put = ctx.http.expectOne('/api/orders/cart/items/v1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ cantidad: 5 });
    put.flush({ variantId: 'v1', cantidad: 5 });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [line('v1', 5)], total: 5000 });
    expect(await result).toEqual({ ok: true, cantidad: 5, recortada: false });
    expect(ctx.cart.items()[0].cantidad).toBe(5);
  });

  it('add de una presentación nueva usa la cantidad pedida', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 3)]);
    const result = ctx.cart.add('v9', 4);
    await flushAsync();
    const put = ctx.http.expectOne('/api/orders/cart/items/v9');
    expect(put.request.body).toEqual({ cantidad: 4 });
    put.flush({ variantId: 'v9', cantidad: 4 });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [], total: 0 });
    expect(await result).toEqual({ ok: true, cantidad: 4, recortada: false });
  });

  it('add recorta a 1000 e indica que se recortó', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 990)]);
    const result = ctx.cart.add('v1', 50);
    await flushAsync();
    const put = ctx.http.expectOne('/api/orders/cart/items/v1');
    expect(put.request.body).toEqual({ cantidad: 1000 });
    put.flush({ variantId: 'v1', cantidad: 1000 });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [line('v1', 1000)], total: 1000 });
    expect(await result).toEqual({ ok: true, cantidad: 1000, recortada: true });
  });

  it('setQuantity envía la cantidad absoluta y recarga', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 3)]);
    const result = ctx.cart.setQuantity('v1', 7);
    const put = ctx.http.expectOne('/api/orders/cart/items/v1');
    expect(put.request.body).toEqual({ cantidad: 7 });
    put.flush({ variantId: 'v1', cantidad: 7 });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [line('v1', 7)], total: 7000 });
    expect(await result).toEqual({ ok: true });
    expect(ctx.cart.items()[0].cantidad).toBe(7);
  });

  it('remove y clear llaman al backend y recargan', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 1), line('v2', 1)]);
    const removed = ctx.cart.remove('v1');
    const del = ctx.http.expectOne('/api/orders/cart/items/v1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [line('v2', 1)], total: 1000 });
    await removed;
    expect(ctx.cart.count()).toBe(1);

    const cleared = ctx.cart.clear();
    const delAll = ctx.http.expectOne('/api/orders/cart');
    expect(delAll.request.method).toBe('DELETE');
    delAll.flush(null, { status: 204, statusText: 'No Content' });
    await flushAsync();
    ctx.http.expectOne('/api/orders/cart').flush({ items: [], total: 0 });
    await cleared;
    expect(ctx.cart.count()).toBe(0);
    expect(ctx.cart.status()).toBe('ready');
  });

  it('un error del backend en una acción se devuelve como ApiError y no recarga', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 1)]);
    const result = ctx.cart.setQuantity('v1', 5);
    ctx.http
      .expectOne('/api/orders/cart/items/v1')
      .flush({ message: 'Máximo 50 líneas' }, { status: 400, statusText: 'Bad Request' });
    expect(await result).toEqual({ ok: false, error: { status: 400, message: 'Máximo 50 líneas' } });
    expect(ctx.cart.status()).toBe('ready');
  });

  it('un error al cargar deja status error sin perder las líneas previas', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 2)]);
    const load = ctx.cart.load();
    ctx.http.expectOne('/api/orders/cart').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await load;
    expect(ctx.cart.status()).toBe('error');
    expect(ctx.cart.error()?.status).toBe(0);
    expect(ctx.cart.count()).toBe(1);
  });

  it('cerrar la sesión vacía el carrito', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 2)]);
    ctx.session.clear();
    TestBed.tick();
    expect(ctx.cart.count()).toBe(0);
    expect(ctx.cart.status()).toBe('idle'
);
  });

  it('cambiar de usuario descarta el carrito anterior y pide el del nuevo', async () => {
    const ctx = setup();
    await loginAs(ctx, [line('v1', 2)]);
    ctx.session.start(TOKENS, { ...USER, id: 'u2' });
    TestBed.tick();
    expect(ctx.cart.count()).toBe(0);
    ctx.http.expectOne('/api/orders/cart').flush({ items: [line('v7', 1)], total: 1000 });
    await flushAsync();
    expect(ctx.cart.items().map((i) => i.variantId)).toEqual(['v7']);
  });

  it('una respuesta de la sesión anterior que llega tarde se descarta', async () => {
    const ctx = setup();
    ctx.session.start(TOKENS, USER);
    TestBed.tick();
    const stale = ctx.http.expectOne('/api/orders/cart');
    ctx.session.clear();
    TestBed.tick();
    stale.flush({ items: [line('v1', 2)], total: 2000 });
    await flushAsync();
    expect(ctx.cart.count()).toBe(0);
    expect(ctx.cart.status()).toBe('idle');
  });
});
