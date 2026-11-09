import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Page, ProductDetail, PublicVariant } from '../../../../core/catalog';
import { Ofertas } from './ofertas';

const P1 = '507f1f77bcf86cd799439011';
const P2 = '507f1f77bcf86cd799439012';

function offer(id: string, productId: string, patch: Partial<PublicVariant> = {}): PublicVariant {
  return {
    id,
    productId,
    presentacion: `Presentación ${id}`,
    unidad: 'kg',
    precio: 30000,
    precioOferta: 25000,
    precioVigente: 25000,
    disponible: 5,
    ...patch,
  };
}

function page(data: PublicVariant[], extra: Partial<Page<PublicVariant>> = {}) {
  return { data, page: 1, limit: 12, total: data.length, totalPages: 1, ...extra };
}

function product(id: string, nombre: string): ProductDetail {
  return {
    id,
    storeId: 's',
    categoryId: 'c',
    nombre,
    marca: 'm',
    fichaTecnica: {},
    requiresQuote: false,
    activo: true,
    variantes: [],
  };
}

describe('Ofertas', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'catalogo/ofertas', component: Ofertas }]),
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
    await harness.navigateByUrl(`/catalogo/ofertas${query}`, Ofertas);
    harness.detectChanges();
  }
  const offersReq = () => http.expectOne((r) => r.url === '/api/catalog/offers');

  it('pide las ofertas con page y limit', async () => {
    await open('?page=2');
    const req = offersReq();
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('12');
  });

  it('hace una sola consulta de producto por cada productId distinto', async () => {
    await open();
    offersReq().flush(page([offer('a', P1), offer('b', P1), offer('c', P2)]));
    await vi.waitFor(() => {
      expect(http.match((r) => r.url === `/api/catalog/products/${P1}`)).toHaveLength(1);
    });
    // `match` ya consumió la de P1; la de P2 sigue abierta, y solo una.
    expect(http.match((r) => r.url === `/api/catalog/products/${P2}`)).toHaveLength(1);
  });

  it('muestra el nombre del producto en cada fila, enlazado al detalle', async () => {
    await open();
    offersReq().flush(page([offer('a', P1), offer('b', P2)]));
    const r1 = await vi.waitFor(() => http.expectOne(`/api/catalog/products/${P1}`));
    const r2 = http.expectOne(`/api/catalog/products/${P2}`);
    r1.flush(product(P1, 'Abono orgánico'));
    r2.flush(product(P2, 'Semilla de maíz'));
    await settle();
    expect(text()).toContain('Abono orgánico');
    expect(text()).toContain('Semilla de maíz');
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Abono orgánico'),
    );
    expect(link?.getAttribute('href')).toBe(`/catalogo/productos/${P1}`);
  });

  it('las filas salen sin esperar los nombres', async () => {
    await open();
    offersReq().flush(page([offer('a', P1)]));
    // La consulta del nombre sigue en vuelo (nunca se responde) y las filas ya están.
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(text()).toContain('Presentación a');
    });
    expect(text()).toContain('$ 25.000');
    expect(text()).toContain('Ver producto');
  });

  it('si falla la consulta de un producto, esa fila sigue con la presentación y el precio', async () => {
    await open();
    offersReq().flush(page([offer('a', P1), offer('b', P2, { presentacion: 'Litro' })]));
    const r1 = await vi.waitFor(() => http.expectOne(`/api/catalog/products/${P1}`));
    const r2 = http.expectOne(`/api/catalog/products/${P2}`);
    r1.flush('Error', { status: 500, statusText: 'Server Error' });
    r2.flush(product(P2, 'Semilla de maíz'));
    await settle();
    expect(text()).toContain('Presentación a');
    expect(text()).toContain('$ 25.000');
    expect(text()).toContain('Ver producto');
    expect(text()).toContain('Semilla de maíz');
    expect(text()).toContain('Litro');
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('muestra el precio anterior tachado', async () => {
    await open();
    offersReq().flush(page([offer('a', P1)]));
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root().querySelector('s')?.textContent).toContain('$ 30.000');
    });
  });

  it('sin ofertas muestra el estado vacío y no consulta productos', async () => {
    await open();
    offersReq().flush(page([], { total: 0, totalPages: 0 }));
    await settle();
    expect(text()).toContain('No hay ofertas por ahora');
    http.expectNone((r) => r.url.startsWith('/api/catalog/products'));
  });

  it('un error de red muestra el mensaje con Reintentar', async () => {
    await open();
    offersReq().error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(text()).toContain('Reintentar');
  });
});
