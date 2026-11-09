import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { PaymentStatus } from '../../../../core/payments';
import { AdminPayment } from '../../models/admin.types';
import { Pagos } from './pagos';

const ID = '0123456789abcdef01234567';

function payment(id: string, status: PaymentStatus, monto = 25000): AdminPayment {
  return {
    id,
    orderId: ID,
    buyerId: ID,
    monto,
    moneda: 'COP',
    metodo: 'PSE',
    status,
    createdAt: '2026-11-08T15:30:00.000Z',
  };
}

function pageOf(data: AdminPayment[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/admin/pagos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/pagos', component: Pagos }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/payments/admin');
  return { el, settle, http, harness, list };
}

describe('Pagos (admin)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista fecha, método, monto con formatCop, estado y comprador', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([payment('p1', 'APPROVED', 230000), payment('p2', 'DECLINED')]));
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Aprobado');
    expect(rows[0]).toContain('PSE');
    expect(rows[0]).toMatch(/230\.000/);
    expect(rows[0]).toMatch(/2026/);
    expect(rows[0]).toContain('01234567…');
    expect(rows[1]).toContain('Rechazado');
    const hrefs = [...el.querySelectorAll('tbody a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/admin/usuarios/${ID}`);
    expect(hrefs).toContain('/admin/pagos/p1');
  });

  it('pide la página 1 con límite 10 y sin filtros por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
  });

  it('lee ?status=, ?buyerId=, ?orderId= y ?page= de la URL', async () => {
    const { settle, list } = await setup(
      `/admin/pagos?status=DECLINED&buyerId=${ID}&orderId=${ID}&page=2`,
    );
    const req = list();
    expect(req.request.params.get('status')).toBe('DECLINED');
    expect(req.request.params.get('buyerId')).toBe(ID);
    expect(req.request.params.get('orderId')).toBe(ID);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([payment('p1', 'DECLINED')], 2, 3));
    await settle();
  });

  it('ignora valores inválidos de la URL', async () => {
    const { settle, list } = await setup('/admin/pagos?status=x&buyerId=abc&orderId=zz&page=0');
    const req = list();
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
  });

  it('cambiar un filtro escribe la URL y reinicia la página', async () => {
    const { settle, list, harness } = await setup('/admin/pagos?page=3');
    list().flush(pageOf([payment('p1', 'APPROVED')], 3, 5));
    await settle();
    const page = harness.routeDebugElement!.componentInstance as unknown as {
      applyFilters(values: Record<string, string>): void;
    };
    page.applyFilters({ status: 'ERROR', orderId: ID });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(TestBed.inject(Router).url).toBe(`/admin/pagos?status=ERROR&orderId=${ID}`);
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([payment('p2', 'ERROR')]));
    await settle();
  });

  it('un 429 muestra «Demasiados intentos, espera un minuto» sin romper la pantalla', async () => {
    const { el, settle, list } = await setup();
    list().flush(
      { statusCode: 429, message: 'ThrottlerException: Too Many Requests' },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await settle();
    expect(el.textContent).toContain('Demasiados intentos, espera un minuto');
    expect(
      [...el.querySelectorAll('button')].some((b) => b.textContent?.includes('Reintentar')),
    ).toBe(true);
  });

  it('no ofrece botones de modificación ni sondea', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([payment('p1', 'PROCESSING')]));
    await settle();
    expect([...el.querySelectorAll('tbody button')].length).toBe(0);
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, list } = await setup();
    list().flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
  });
});
