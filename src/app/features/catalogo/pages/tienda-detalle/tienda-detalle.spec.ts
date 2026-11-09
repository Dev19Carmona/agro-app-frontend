import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Page, Product, PublicStore } from '../../../../core/catalog';
import { TiendaDetalle } from './tienda-detalle';

const ID = '507f1f77bcf86cd799439011';
const STORE: PublicStore = { id: ID, nombre: 'Tienda Verde', municipio: 'Rionegro' };

function product(n: number): Product {
  return {
    id: `507f1f77bcf86cd7994390${String(10 + n)}`,
    storeId: ID,
    categoryId: '507f1f77bcf86cd799439099',
    nombre: `Producto ${n}`,
    marca: `Marca ${n}`,
    fichaTecnica: {},
    requiresQuote: false,
    activo: true,
  };
}

function page(data: Product[], extra: Partial<Page<Product>> = {}): Page<Product> {
  return { data, page: 1, limit: 12, total: data.length, totalPages: 1, ...extra };
}

describe('TiendaDetalle', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'catalogo/tiendas/:id', component: TiendaDetalle }]),
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
  async function open(id: string, query = '') {
    await harness.navigateByUrl(`/catalogo/tiendas/${id}${query}`, TiendaDetalle);
    harness.detectChanges();
  }
  const productsReq = () => http.expectOne((r) => r.url === '/api/catalog/products');

  it('pide la tienda y sus productos con storeId y page', async () => {
    await open(ID, '?page=2');
    http.expectOne(`/api/catalog/stores/${ID}`);
    const req = productsReq();
    expect(req.request.params.get('storeId')).toBe(ID);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('12');
  });

  it('muestra nombre, municipio y los productos', async () => {
    await open(ID);
    http.expectOne(`/api/catalog/stores/${ID}`).flush(STORE);
    http.expectOne('/api/catalog/categories').flush([]);
    productsReq().flush(page([product(1), product(2)], { total: 2 }));
    await settle();
    expect(text()).toContain('Tienda Verde');
    expect(text()).toContain('Rionegro');
    expect(text()).toContain('Producto 1');
    expect(text()).toContain('Producto 2');
    expect(text()).toContain('2 productos');
  });

  it('una tienda sin productos lo dice', async () => {
    await open(ID);
    http.expectOne(`/api/catalog/stores/${ID}`).flush(STORE);
    http.expectOne('/api/catalog/categories').flush([]);
    productsReq().flush(page([], { total: 0, totalPages: 0 }));
    await settle();
    expect(text()).toContain('Esta tienda aún no tiene productos');
  });

  it('una página fuera de rango ofrece volver a la primera', async () => {
    await open(ID, '?page=999');
    http.expectOne(`/api/catalog/stores/${ID}`).flush(STORE);
    http.expectOne('/api/catalog/categories').flush([]);
    productsReq().flush(page([], { page: 999, total: 0, totalPages: 0 }));
    await settle();
    expect(text()).toContain('Esta página no existe');
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Ir a la primera página'),
    );
    expect(link?.getAttribute('href')).toBe(`/catalogo/tiendas/${ID}`);
  });

  it('un 404 muestra "Tienda no encontrada" con enlace al listado', async () => {
    await open(ID);
    http
      .expectOne(`/api/catalog/stores/${ID}`)
      .flush(
        { statusCode: 404, message: 'Tienda no encontrada', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne('/api/catalog/categories').flush([]);
    productsReq().flush(page([]));
    await settle();
    expect(text()).toContain('Tienda no encontrada');
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Ver las tiendas'),
    );
    expect(link?.getAttribute('href')).toBe('/catalogo/tiendas');
  });

  it('un id inválido muestra "Tienda no encontrada" sin pedir tienda ni productos', async () => {
    await open('xyz');
    expect(text()).toContain('Tienda no encontrada');
    http.expectNone((r) => r.url.startsWith('/api/catalog/stores'));
    http.expectNone((r) => r.url.startsWith('/api/catalog/products'));
  });

  it('un error de red muestra el mensaje con Reintentar', async () => {
    await open(ID);
    http.expectOne(`/api/catalog/stores/${ID}`).error(new ProgressEvent('error'));
    http.expectOne('/api/catalog/categories').flush([]);
    productsReq().error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
    expect(text()).toContain('Reintentar');
  });
});
