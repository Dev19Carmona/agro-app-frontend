import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { Payment, PaymentStatus } from '../../../../core/payments';
import { MisPagos } from './mis-pagos';

const ORDER_ID = '507f1f77bcf86cd799439011';

function payment(id: string, status: PaymentStatus, monto = 25000): Payment {
  return {
    id,
    orderId: ORDER_ID,
    monto,
    moneda: 'COP',
    metodo: 'PSE',
    status,
    createdAt: '2026-11-08T15:30:00.000Z',
  };
}

function pageOf(data: Payment[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/pagos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'pagos', component: MisPagos }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/payments');
  return { el, settle, http, harness, list };
}

describe('MisPagos', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista los pagos con fecha, método, monto con formatCop y estado', async () => {
    const { el, settle, list } = await setup();
    list().flush(
      pageOf([
        payment('p1', 'APPROVED', 230000),
        payment('p2', 'DECLINED'),
        payment('p3', 'PROCESSING'),
      ]),
    );
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(3);
    expect(rows[0]).toContain('Aprobado');
    expect(rows[0]).toContain('PSE');
    expect(rows[0]).toMatch(/230\.000/);
    expect(rows[0]).toMatch(/2026/);
    expect(rows[1]).toContain('Rechazado');
    expect(rows[2]).toContain('En proceso');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/pagos/p1');
  });

  it('pide la página 1 con límite 10 y sin filtros por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('orderId')).toBe(false);
    req.flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
  });

  it('lee ?status=, ?orderId= y ?page= de la URL', async () => {
    const { settle, list, el } = await setup(`/pagos?status=DECLINED&orderId=${ORDER_ID}&page=2`);
    const req = list();
    expect(req.request.params.get('status')).toBe('DECLINED');
    expect(req.request.params.get('orderId')).toBe(ORDER_ID);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([payment('p1', 'DECLINED')], 2, 3));
    await settle();
    expect((el.querySelector('input') as HTMLInputElement).value).toBe(ORDER_ID);
  });

  it('ignora valores inválidos de la URL', async () => {
    const { settle, list } = await setup('/pagos?status=otro&orderId=abc&page=-4');
    const req = list();
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('orderId')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
  });

  it('cambiar el estado reinicia la página y lo escribe en la URL', async () => {
    const { settle, list, harness, http } = await setup('/pagos?page=3');
    list().flush(pageOf([payment('p1', 'APPROVED')], 3, 4));
    await settle();
    const router = TestBed.inject(Router);
    const select = harness.fixture.debugElement.query(By.directive(Select));
    (select.componentInstance as Select).value.set('ERROR');
    const req = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/payments'));
    expect(router.url).toBe('/pagos?status=ERROR');
    expect(req.request.params.get('status')).toBe('ERROR');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([]));
    await settle();
  });

  it('filtrar por pedido escribe orderId en la URL, conserva el estado y reinicia la página', async () => {
    const { settle, list, harness, http, el } = await setup('/pagos?status=DECLINED&page=2');
    list().flush(pageOf([payment('p1', 'DECLINED')], 2, 3));
    await settle();
    const router = TestBed.inject(Router);
    const input = harness.fixture.debugElement.query(By.directive(Input));
    (input.componentInstance as Input).value.set(ORDER_ID);
    await settle();
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    const req = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/payments'));
    expect(router.url).toBe(`/pagos?status=DECLINED&orderId=${ORDER_ID}`);
    expect(req.request.params.get('orderId')).toBe(ORDER_ID);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([payment('p1', 'DECLINED')]));
    await settle();
  });

  it('un id de pedido inválido muestra el error y no pide nada', async () => {
    const { settle, list, harness, http, el } = await setup();
    list().flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
    const input = harness.fixture.debugElement.query(By.directive(Input));
    (input.componentInstance as Input).value.set('abc');
    await settle();
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
    expect(el.textContent).toContain('24 caracteres');
    http.expectNone((r) => r.url === '/api/payments');
  });

  it('con varias páginas muestra la paginación', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([payment('p1', 'APPROVED')], 1, 3));
    await settle();
    expect(el.querySelector('nav[aria-label="Paginación de pagos"]')).not.toBeNull();
  });

  it('sin pagos muestra el estado vacío con enlace a los pedidos', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('Aún no tienes pagos');
    expect(el.querySelectorAll('a[href="/pedidos"]').length).toBeGreaterThan(0);
  });

  it('con un filtro sin resultados ofrece quitarlo', async () => {
    const { el, settle, list } = await setup('/pagos?status=ERROR');
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('No hay pagos con estos filtros');
    expect(el.textContent).toContain('Quitar los filtros');
  });

  it('con un error de red muestra el mensaje y Reintentar vuelve a pedir', async () => {
    const { el, settle, list, http } = await setup();
    list().error(new ProgressEvent('error'));
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar'))?.click();
    const again = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/payments'));
    again.flush(pageOf([payment('p1', 'APPROVED')]));
    await settle();
    expect(el.textContent).toContain('Aprobado');
  });
});
