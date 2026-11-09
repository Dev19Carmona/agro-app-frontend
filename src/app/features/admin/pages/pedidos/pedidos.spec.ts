import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { OrderStatus } from '../../../../core/orders';
import { AdminOrderSummary } from '../../models/admin.types';
import { Pedidos } from './pedidos';

const BUYER = '0123456789abcdef01234567';

function order(id: string, status: OrderStatus, total = 50000): AdminOrderSummary {
  return {
    id,
    total,
    moneda: 'COP',
    status,
    buyerId: BUYER,
    createdAt: '2026-11-08T15:30:00.000Z',
  };
}

function pageOf(data: AdminOrderSummary[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/admin/pedidos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/pedidos', component: Pedidos }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/orders/admin');
  return { el, settle, http, harness, list };
}

describe('Pedidos (admin)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista fecha, total con formatCop, estado y comprador abreviado con enlace', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([order('o1', 'CONFIRMED', 230000), order('o2', 'CANCELLED')]));
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Confirmado');
    expect(rows[0]).toMatch(/230\.000/);
    expect(rows[0]).toMatch(/2026/);
    expect(rows[0]).toContain('01234567…');
    expect(rows[1]).toContain('Cancelado');
    const hrefs = [...el.querySelectorAll('tbody a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/admin/usuarios/${BUYER}`);
    expect(hrefs).toContain('/admin/pedidos/o1');
  });

  it('no ofrece botones de modificación', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([order('o1', 'AWAITING_PAYMENT')]));
    await settle();
    const buttons = [...el.querySelectorAll('tbody button')].map((b) => b.textContent?.trim());
    expect(buttons).toEqual([]);
  });

  it('pide la página 1 con límite 10 y sin filtros por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('buyerId')).toBe(false);
    req.flush(pageOf([order('o1', 'CONFIRMED')]));
    await settle();
  });

  it('lee ?status=, ?buyerId= y ?page= de la URL y los muestra', async () => {
    const { el, settle, list } = await setup(
      `/admin/pedidos?status=CONFIRMED&buyerId=${BUYER}&page=2`,
    );
    const req = list();
    expect(req.request.params.get('status')).toBe('CONFIRMED');
    expect(req.request.params.get('buyerId')).toBe(BUYER);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([order('o1', 'CONFIRMED')], 2, 3));
    await settle();
    expect((el.querySelector('input') as HTMLInputElement).value).toBe(BUYER);
  });

  it('ignora valores inválidos de la URL', async () => {
    const { settle, list } = await setup('/admin/pedidos?status=PAID&buyerId=abc&page=-4');
    const req = list();
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('buyerId')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([order('o1', 'CONFIRMED')]));
    await settle();
  });

  it('cambiar un filtro escribe la URL y reinicia la página', async () => {
    const { settle, list, harness } = await setup('/admin/pedidos?page=3');
    list().flush(pageOf([order('o1', 'CONFIRMED')], 3, 5));
    await settle();
    const page = harness.routeDebugElement!.componentInstance as unknown as {
      applyFilters(values: Record<string, string>): void;
    };
    page.applyFilters({ status: 'CANCELLED', buyerId: BUYER });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(TestBed.inject(Router).url).toBe(`/admin/pedidos?status=CANCELLED&buyerId=${BUYER}`);
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([order('o2', 'CANCELLED')]));
    await settle();
  });

  it('sin resultados con filtros ofrece quitarlos', async () => {
    const { el, settle, list } = await setup('/admin/pedidos?status=CANCELLED');
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('No hay pedidos con estos filtros');
    expect(el.textContent).toContain('Quitar los filtros');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, list } = await setup();
    list().flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
  });
});
