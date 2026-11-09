import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Order } from '../models/orders.types';
import { OrdersApi } from './orders-api';

const ORDER: Order = {
  id: 'o1',
  buyerId: 'u1',
  total: 5000,
  moneda: 'COP',
  status: 'AWAITING_PAYMENT',
  createdAt: '2026-11-09T10:00:00.000Z',
  subOrders: [],
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(OrdersApi), http: TestBed.inject(HttpTestingController) };
}

describe('OrdersApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('getOrder pide el pedido por id y convierte los errores en ApiError', () => {
    const { api: ok, http: okHttp } = setup();
    let result: Order | undefined;
    ok.getOrder('o1').subscribe((order) => (result = order));
    const req = okHttp.expectOne('/api/orders/o1');
    expect(req.request.method).toBe('GET');
    req.flush(ORDER);
    expect(result).toEqual(ORDER);

    let error: unknown;
    ok.getOrder('o1').subscribe({ error: (e: unknown) => (error = e) });
    okHttp
      .expectOne('/api/orders/o1')
      .flush({ message: 'Pedido no encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(error).toEqual({ status: 404, message: 'Pedido no encontrado' });
  });
});
