import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Payment } from '../../../core/payments';
import { PagosApi } from './pagos-api';

const PAYMENT: Payment = {
  id: 'p1',
  orderId: 'o1',
  monto: 5000,
  moneda: 'COP',
  metodo: 'CARD',
  status: 'APPROVED',
  referencia: 'SIM-1',
  createdAt: '2026-11-09T10:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(PagosApi), http: TestBed.inject(HttpTestingController) };
}

describe('PagosApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('createPayment envía POST con el header Idempotency-Key y sin monto', () => {
    const { api, http } = setup();
    let result: Payment | undefined;
    api
      .createPayment({ orderId: 'o1', metodo: 'CARD', token: 'tok_test_approved' }, 'clave-12345')
      .subscribe((payment) => (result = payment));
    const req = http.expectOne('/api/payments');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-12345');
    expect(req.request.body).toEqual({
      orderId: 'o1',
      metodo: 'CARD',
      token: 'tok_test_approved',
    });
    expect('monto' in req.request.body).toBe(false);
    req.flush(PAYMENT, { status: 201, statusText: 'Created' });
    expect(result).toEqual(PAYMENT);
  });

  it('createPayment acepta el 200 de una clave repetida', () => {
    const { api, http } = setup();
    let result: Payment | undefined;
    api
      .createPayment({ orderId: 'o1', metodo: 'PSE', token: 'x' }, 'clave-12345')
      .subscribe((payment) => (result = payment));
    http.expectOne('/api/payments').flush(PAYMENT, { status: 200, statusText: 'OK' });
    expect(result).toEqual(PAYMENT);
  });

  it('createPayment conserva el code de un 409', () => {
    const { api, http } = setup();
    let error: unknown;
    api
      .createPayment({ orderId: 'o1', metodo: 'NEQUI', token: 'x' }, 'clave-12345')
      .subscribe({ error: (e: unknown) => (error = e) });
    http
      .expectOne('/api/payments')
      .flush(
        { code: 'PAYMENT_IN_PROGRESS', message: 'En curso' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(error).toEqual({ status: 409, message: 'En curso', code: 'PAYMENT_IN_PROGRESS' });
  });

  it('listPayments envía solo los parámetros con valor', () => {
    const { api, http } = setup();
    api.listPayments({ page: 2 }).subscribe();
    const first = http.expectOne((r) => r.url === '/api/payments');
    expect(first.request.method).toBe('GET');
    expect(first.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(first.request.params.get('page')).toBe('2');
    expect(first.request.params.get('limit')).toBe('10');
    first.flush({ data: [], page: 2, limit: 10, total: 0, totalPages: 0 });

    api.listPayments({ page: 1, status: 'DECLINED', orderId: 'a'.repeat(24) }, 1).subscribe();
    const second = http.expectOne((r) => r.url === '/api/payments');
    expect(second.request.params.get('status')).toBe('DECLINED');
    expect(second.request.params.get('orderId')).toBe('a'.repeat(24));
    expect(second.request.params.get('limit')).toBe('1');
    second.flush({ data: [], page: 1, limit: 1, total: 0, totalPages: 0 });
  });

  it('getPayment pide el pago por id y convierte los errores en ApiError', () => {
    const { api, http } = setup();
    let result: Payment | undefined;
    api.getPayment('p1').subscribe((payment) => (result = payment));
    http.expectOne('/api/payments/p1').flush(PAYMENT);
    expect(result).toEqual(PAYMENT);

    let error: unknown;
    api.getPayment('p2').subscribe({ error: (e: unknown) => (error = e) });
    http
      .expectOne('/api/payments/p2')
      .flush({ message: 'Pago no encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(error).toEqual({ status: 404, message: 'Pago no encontrado' });
  });

  it('un 502 del proxy se trata como sin conexión', () => {
    const { api, http } = setup();
    let error: unknown;
    api.getPayment('p1').subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne('/api/payments/p1').flush(null, { status: 502, statusText: 'Bad Gateway' });
    expect(error).toEqual({ status: 0, message: 'No se pudo conectar con el servidor' });
  });
});
