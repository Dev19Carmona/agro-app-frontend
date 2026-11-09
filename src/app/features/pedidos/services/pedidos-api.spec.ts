import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Order } from '../../../core/orders';
import { CheckoutApiError } from '../models/pedidos.types';
import { PedidosApi } from './pedidos-api';

const ORDER: Order = {
  id: 'o1',
  buyerId: 'u1',
  total: 5000,
  moneda: 'COP',
  status: 'PENDING',
  createdAt: '2026-11-09T10:00:00.000Z',
  subOrders: [],
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(PedidosApi), http: TestBed.inject(HttpTestingController) };
}

describe('PedidosApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('checkout envía POST con el header Idempotency-Key', () => {
    const { api, http } = setup();
    let result: Order | undefined;
    api.checkout('clave-12345').subscribe((order) => (result = order));
    const req = http.expectOne('/api/orders/checkout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-12345');
    req.flush(ORDER, { status: 201, statusText: 'Created' });
    expect(result).toEqual(ORDER);
  });

  it('checkout con 400 y líneas devuelve un CheckoutApiError con las líneas', () => {
    const { api, http } = setup();
    let error: CheckoutApiError | undefined;
    api.checkout('clave-12345').subscribe({ error: (e: CheckoutApiError) => (error = e) });
    http.expectOne('/api/orders/checkout').flush(
      {
        message: 'El carrito tiene líneas que no se pueden comprar',
        lineas: [{ variantId: 'v1', motivo: 'NOT_APTA' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(error?.status).toBe(400);
    expect(error?.lineas).toEqual([{ variantId: 'v1', motivo: 'NOT_APTA' }]);
  });

  it('listOrders solo envía los parámetros con valor', () => {
    const { api, http } = setup();
    api.listOrders({ page: 2 }).subscribe();
    const first = http.expectOne((r) => r.url === '/api/orders');
    expect(first.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(first.request.params.get('page')).toBe('2');
    expect(first.request.params.get('limit')).toBe('10');
    first.flush({ data: [], page: 2, limit: 10, total: 0, totalPages: 0 });

    api.listOrders({ page: 1, status: 'CONFIRMED' }).subscribe();
    const second = http.expectOne((r) => r.url === '/api/orders');
    expect(second.request.params.get('status')).toBe('CONFIRMED');
    second.flush({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it('un 502 del proxy se trata como sin conexión', () => {
    const { api, http } = setup();
    let error: unknown;
    api.listOrders({ page: 1 }).subscribe({ error: (e: unknown) => (error = e) });
    http
      .expectOne((r) => r.url === '/api/orders')
      .flush(null, {
        status: 502,
        statusText: 'Bad Gateway',
      });
    expect(error).toEqual({ status: 0, message: 'No se pudo conectar con el servidor' });
  });
});
