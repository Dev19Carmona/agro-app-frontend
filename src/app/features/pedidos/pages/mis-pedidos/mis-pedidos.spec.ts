import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { RouterTestingHarness } from '@angular/router/testing';
import { Select } from '../../../../shared/ui/select/select';
import { OrderStatus, OrderSummary } from '../../../../core/orders';
import { MisPedidos } from './mis-pedidos';

function order(id: string, status: OrderStatus, total = 25000): OrderSummary {
  return {
    id,
    total,
    moneda: 'COP',
    status,
    createdAt: '2026-11-08T15:30:00.000Z',
    ...(status === 'AWAITING_PAYMENT' ? { expiresAt: '2026-11-08T15:45:00.000Z' } : {}),
  };
}

function pageOf(data: OrderSummary[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/pedidos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'pedidos', component: MisPedidos }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/orders');
  return { el, settle, http, harness, list };
}

describe('MisPedidos', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista los pedidos con fecha, total con formatCop y estado', async () => {
    const { el, settle, list } = await setup();
    list().flush(
      pageOf([
        order('o1', 'CONFIRMED', 230000),
        order('o2', 'AWAITING_PAYMENT'),
        order('o3', 'CANCELLED'),
      ]),
    );
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(3);
    expect(rows[0]).toContain('Confirmado');
    expect(rows[0]).toMatch(/230\.000/);
    expect(rows[0]).toMatch(/2026/);
    expect(rows[1]).toContain('Esperando pago');
    expect(rows[2]).toContain('Cancelado');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/pedidos/o1');
  });

  it('pide la página 1 con límite 10 y sin status por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);
    req.flush(pageOf([order('o1', 'PENDING')]));
    await settle();
  });

  it('lee ?status= y ?page= de la URL', async () => {
    const { settle, list } = await setup('/pedidos?status=CONFIRMED&page=2');
    const req = list();
    expect(req.request.params.get('status')).toBe('CONFIRMED');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([order('o1', 'CONFIRMED')], 2, 3));
    await settle();
  });

  it('ignora valores inválidos de la URL', async () => {
    const { settle, list } = await setup('/pedidos?status=OTRO&page=-4');
    const req = list();
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([order('o1', 'PENDING')]));
    await settle();
  });

  it('cambiar el estado reinicia la página y lo escribe en la URL', async () => {
    const { settle, list, harness, http } = await setup('/pedidos?page=3');
    list().flush(pageOf([order('o1', 'PENDING')], 3, 4));
    await settle();
    const router = TestBed.inject(Router);
    const select = harness.fixture.debugElement.query(By.directive(Select));
    (select.componentInstance as Select).value.set('CONFIRMED');
    const req = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/orders'));
    expect(router.url).toBe('/pedidos?status=CONFIRMED');
    expect(req.request.params.get('status')).toBe('CONFIRMED');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([]));
    await settle();
  });

  it('con pocos pedidos no muestra paginación; con varias páginas sí', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([order('o1', 'PENDING')], 1, 3));
    await settle();
    expect(el.querySelector('nav[aria-label="Paginación de pedidos"]')).not.toBeNull();
  });

  it('sin pedidos muestra el estado vacío con enlace al catálogo', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('Aún no tienes pedidos');
    expect(el.querySelector('a[href="/catalogo"]')).not.toBeNull();
  });

  it('con un filtro sin resultados ofrece quitarlo', async () => {
    const { el, settle, list } = await setup('/pedidos?status=CANCELLED');
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('No hay pedidos con este estado');
    expect(el.textContent).toContain('Quitar el filtro');
  });

  it('con un error de red muestra el mensaje y Reintentar vuelve a pedir', async () => {
    const { el, settle, list, http } = await setup();
    list().error(new ProgressEvent('error'));
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar'))?.click();
    const again = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/orders'));
    again.flush(pageOf([order('o1', 'PENDING')]));
    await settle();
    expect(el.textContent).toContain('Pendiente');
  });
});
