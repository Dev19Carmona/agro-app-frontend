import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Order } from '../../../../core/orders';
import { PedidoDetalle } from './pedido-detalle';

const ID = '0123456789abcdef01234567';
const BUYER = 'fedcba9876543210fedcba98';
const STORE_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const STORE_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const ORDER: Order = {
  id: ID,
  total: 90000,
  moneda: 'COP',
  status: 'CONFIRMED',
  buyerId: BUYER,
  createdAt: '2026-11-08T15:30:00.000Z',
  subOrders: [
    {
      id: 's1',
      storeId: STORE_A,
      subtotal: 50000,
      items: [
        {
          id: 'i1',
          variantId: 'v1',
          productId: 'p1',
          nombreProducto: 'Papa criolla',
          presentacion: 'Bulto',
          unidad: 'kg',
          precioUnitario: 25000,
          cantidad: 2,
          subtotal: 50000,
        },
      ],
    },
    {
      id: 's2',
      storeId: STORE_B,
      subtotal: 40000,
      items: [
        {
          id: 'i2',
          variantId: 'v2',
          productId: 'p2',
          nombreProducto: 'Maíz',
          presentacion: 'Saco',
          unidad: 'kg',
          precioUnitario: 40000,
          cantidad: 1,
          subtotal: 40000,
        },
      ],
    },
  ],
};

function store(id: string, nombre: string) {
  return { id, nombre, nit: '1', ownerId: 'o', municipio: 'Pasto', activa: true, createdAt: '' };
}

async function setup(url = `/admin/pedidos/${ID}`) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/pedidos/:id', component: PedidoDetalle }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    harness.detectChanges();
  };
  return { el, settle, http };
}

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

describe('PedidoDetalle (admin)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el pedido con sub-pedidos por tienda, ítems y nombres de tienda', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/admin/${ID}`).flush(ORDER);
    await settle();
    http.expectOne(`/api/catalog/admin/stores/${STORE_A}`).flush(store(STORE_A, 'Agro Sur'));
    http.expectOne(`/api/catalog/admin/stores/${STORE_B}`).flush(store(STORE_B, 'Campo Verde'));
    await settle();
    const t = text(el);
    expect(t).toContain('Confirmado');
    expect(t).toMatch(/90\.000/);
    expect(t).toContain('Agro Sur');
    expect(t).toContain('Campo Verde');
    expect(t).toContain('Papa criolla');
    expect(t).toContain('Maíz');
    expect(t).toContain('fedcba98…');
  });

  it('consulta cada tienda distinta una sola vez', async () => {
    const { settle, http } = await setup();
    const order: Order = {
      ...ORDER,
      subOrders: [ORDER.subOrders[0], { ...ORDER.subOrders[1], storeId: STORE_A }],
    };
    http.expectOne(`/api/orders/admin/${ID}`).flush(order);
    await settle();
    http.expectOne(`/api/catalog/admin/stores/${STORE_A}`).flush(store(STORE_A, 'Agro Sur'));
    await settle();
  });

  it('si falla el nombre de una tienda muestra su id abreviado', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/admin/${ID}`).flush(ORDER);
    await settle();
    http.expectOne(`/api/catalog/admin/stores/${STORE_A}`).flush(store(STORE_A, 'Agro Sur'));
    http
      .expectOne(`/api/catalog/admin/stores/${STORE_B}`)
      .flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(el)).toContain('Agro Sur');
    expect(text(el)).toContain('bbbbbbbb…');
  });

  it('no ofrece ninguna acción de modificación', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/admin/${ID}`).flush(ORDER);
    await settle();
    http.expectOne(`/api/catalog/admin/stores/${STORE_A}`).flush(store(STORE_A, 'A'));
    http.expectOne(`/api/catalog/admin/stores/${STORE_B}`).flush(store(STORE_B, 'B'));
    await settle();
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('enlaza al comprador y a los pagos del pedido', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/admin/${ID}`).flush(ORDER);
    await settle();
    http.expectOne(`/api/catalog/admin/stores/${STORE_A}`).flush(store(STORE_A, 'A'));
    http.expectOne(`/api/catalog/admin/stores/${STORE_B}`).flush(store(STORE_B, 'B'));
    await settle();
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/admin/usuarios/${BUYER}`);
    expect(hrefs).toContain(`/admin/pagos?orderId=${ID}`);
  });

  it('un id con formato inválido muestra «Pedido no encontrado» sin pedir nada', async () => {
    const { el, settle } = await setup('/admin/pedidos/abc');
    await settle();
    expect(text(el)).toContain('Pedido no encontrado');
    expect(el.querySelector('a[href="/admin/pedidos"]')).not.toBeNull();
  });

  it('un 404 muestra «Pedido no encontrado»', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/orders/admin/${ID}`)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(el)).toContain('Pedido no encontrado');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/orders/admin/${ID}`)
      .flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(text(el)).toContain('No se pudo conectar con el servidor');
  });
});
