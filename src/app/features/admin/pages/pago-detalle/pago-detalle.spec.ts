import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminPaymentDetail } from '../../models/admin.types';
import { PagoDetalle } from './pago-detalle';

const ID = '0123456789abcdef01234567';
const ORDER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BUYER = 'fedcba9876543210fedcba98';
const URL = `/api/payments/admin/${ID}`;

function payment(overrides: Partial<AdminPaymentDetail> = {}): AdminPaymentDetail {
  return {
    id: ID,
    orderId: ORDER,
    buyerId: BUYER,
    monto: 230000,
    moneda: 'COP',
    metodo: 'CARD',
    status: 'DECLINED',
    referencia: 'SIM-123',
    motivoRechazo: 'INSUFFICIENT_FUNDS',
    createdAt: '2026-11-08T15:30:00.000Z',
    attempts: [
      {
        origen: 'CLIENT',
        resultado: 'DECLINED',
        motivo: 'INSUFFICIENT_FUNDS',
        createdAt: '2026-11-08T15:30:00.000Z',
      },
    ],
    ...overrides,
  };
}

async function setup(url = `/admin/pagos/${ID}`) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/pagos/:id', component: PagoDetalle }]),
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
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, settle, http };
}

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

describe('PagoDetalle (admin)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el pago, el motivo en español y el historial de intentos', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(payment());
    await settle();
    const t = text(el);
    expect(t).toContain('Rechazado');
    expect(t).toMatch(/230\.000/);
    expect(t).toContain('Tarjeta');
    expect(t).toContain('SIM-123');
    expect(t).toContain('Fondos insuficientes');
    expect(t).toContain('fedcba98…');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
    expect(t).toContain('CLIENT');
    expect(t).toContain('INSUFFICIENT_FUNDS');
  });

  it('enlaza al pedido y al comprador', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(payment());
    await settle();
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/admin/pedidos/${ORDER}`);
    expect(hrefs).toContain(`/admin/usuarios/${BUYER}`);
  });

  it('no ofrece ninguna acción de modificación', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(payment());
    await settle();
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('un pago sin intentos lo dice', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush(payment({ attempts: [], status: 'PENDING', motivoRechazo: undefined }));
    await settle();
    expect(text(el)).toContain('aún no tiene intentos');
  });

  it('un 429 muestra «Demasiados intentos, espera un minuto»', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush({ statusCode: 429, message: 'Too Many Requests' }, { status: 429, statusText: 'x' });
    await settle();
    expect(text(el)).toContain('Demasiados intentos, espera un minuto');
  });

  it('un id con formato inválido muestra «Pago no encontrado» sin pedir nada', async () => {
    const { el, settle } = await setup('/admin/pagos/abc');
    await settle();
    expect(text(el)).toContain('Pago no encontrado');
    expect(el.querySelector('a[href="/admin/pagos"]')).not.toBeNull();
  });

  it('un 404 muestra «Pago no encontrado»', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(el)).toContain('Pago no encontrado');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(text(el)).toContain('No se pudo conectar con el servidor');
  });
});
