import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Page, PublicStore } from '../../../../core/catalog';
import { Tiendas } from './tiendas';

function store(n: number): PublicStore {
  return {
    id: `507f1f77bcf86cd7994390${String(10 + n)}`,
    nombre: `Tienda ${n}`,
    municipio: `Municipio ${n}`,
  };
}

function page(data: PublicStore[], extra: Partial<Page<PublicStore>> = {}): Page<PublicStore> {
  return { data, page: 1, limit: 12, total: data.length, totalPages: 1, ...extra };
}

describe('Tiendas', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'catalogo/tiendas', component: Tiendas }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.match(() => true));

  const root = () => harness.routeNativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function open(query = '') {
    await harness.navigateByUrl(`/catalogo/tiendas${query}`, Tiendas);
    harness.detectChanges();
  }
  const storesReq = () => http.expectOne((r) => r.url === '/api/catalog/stores');

  it('pide las tiendas con page y limit', async () => {
    await open();
    const req = storesReq();
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('limit')).toBe('12');
  });

  it('lleva municipio y página de la URL a la petición', async () => {
    await open('?municipio=Bello&page=2');
    const req = storesReq();
    expect(req.request.params.get('municipio')).toBe('Bello');
    expect(req.request.params.get('page')).toBe('2');
  });

  it.each(['?page=0', '?page=abc', '?municipio='])('ignora el valor inválido %s', async (query) => {
    await open(query);
    const req = storesReq();
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('page')).toBe('1');
  });

  it('muestra las tiendas con su municipio y enlace al detalle', async () => {
    await open();
    storesReq().flush(page([store(1), store(2)], { total: 2 }));
    await settle();
    expect(text()).toContain('Tienda 1');
    expect(text()).toContain('Municipio 2');
    expect(text()).toContain('2 tiendas');
    const link = [...root().querySelectorAll('a')].find((a) => a.textContent?.includes('Tienda 1'));
    expect(link?.getAttribute('href')).toBe(`/catalogo/tiendas/${store(1).id}`);
  });

  it('con filtro de municipio sin resultados ofrece quitarlo', async () => {
    await open('?municipio=Nowhere');
    storesReq().flush(page([], { total: 0, totalPages: 0 }));
    await settle();
    expect(text()).toContain('No hay tiendas en ese municipio');
  });

  it('una página fuera de rango ofrece volver a la primera', async () => {
    await open('?page=999');
    storesReq().flush(page([], { page: 999, total: 0, totalPages: 0 }));
    await settle();
    expect(text()).toContain('Esta página no existe');
  });

  it('un error de red muestra el mensaje con Reintentar', async () => {
    await open();
    storesReq().error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(text()).toContain('Reintentar');
  });

  it('filtrar por municipio lo pone en la URL y reinicia la página', async () => {
    await open('?page=3');
    storesReq().flush(page([store(1)], { page: 3, total: 40, totalPages: 4 }));
    await settle();
    const input = root().querySelector<HTMLInputElement>('input')!;
    input.value = 'Bello';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    [...root().querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Filtrar')
      ?.click();
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe('/catalogo/tiendas?municipio=Bello'),
    );
  });
});
