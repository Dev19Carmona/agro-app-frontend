import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { StoreDetail } from '../../../../core/catalog';
import { Tiendas } from './tiendas';

function store(id: string, overrides: Partial<StoreDetail> = {}): StoreDetail {
  return {
    id,
    nombre: `Tienda ${id}`,
    nit: '900123',
    ownerId: 'o1',
    municipio: 'Pasto',
    activa: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

function pageOf(data: StoreDetail[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/admin/tiendas') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/tiendas', component: Tiendas }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/catalog/admin/stores');
  return { el, settle, http, harness, list };
}

describe('Tiendas', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista tiendas activas e inactivas con el badge «Inactiva»', async () => {
    const { el, settle, list } = await setup();
    list().flush(pageOf([store('t1'), store('t2', { activa: false })]));
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Tienda t1');
    expect(rows[0]).not.toContain('Inactiva');
    expect(rows[1]).toContain('Inactiva');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/admin/tiendas/t1');
  });

  it('pide la página 1 con límite 10 y sin municipio por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('municipio')).toBe(false);
    req.flush(pageOf([store('t1')]));
    await settle();
  });

  it('lee ?municipio= y ?page= de la URL y los muestra', async () => {
    const { el, settle, list } = await setup('/admin/tiendas?municipio=Pasto&page=2');
    const req = list();
    expect(req.request.params.get('municipio')).toBe('Pasto');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([store('t1')], 2, 3));
    await settle();
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('Pasto');
  });

  it('ignora un municipio vacío y una página inválida', async () => {
    const { settle, list } = await setup('/admin/tiendas?municipio=%20%20&page=abc');
    const req = list();
    expect(req.request.params.has('municipio')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([store('t1')]));
    await settle();
  });

  it('filtrar por municipio escribe la URL y reinicia la página', async () => {
    const { settle, list, harness } = await setup('/admin/tiendas?page=3');
    list().flush(pageOf([store('t1')], 3, 5));
    await settle();
    const page = harness.routeDebugElement!.componentInstance as unknown as {
      applyFilters(values: Record<string, string>): void;
    };
    page.applyFilters({ municipio: 'Ipiales' });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(TestBed.inject(Router).url).toBe('/admin/tiendas?municipio=Ipiales');
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([store('t2')]));
    await settle();
  });

  it('sin resultados con filtro ofrece quitarlo', async () => {
    const { el, settle, list } = await setup('/admin/tiendas?municipio=Nowhere');
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('No hay tiendas en este municipio');
    expect(el.textContent).toContain('Quitar los filtros');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, list } = await setup();
    list().flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
  });
});
