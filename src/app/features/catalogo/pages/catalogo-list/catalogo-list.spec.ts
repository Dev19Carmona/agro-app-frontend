import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Page, Product, PublicCategory, PublicStore } from '../../../../core/catalog';
import { CatalogoList } from './catalogo-list';

const CAT_ID = '507f1f77bcf86cd799439011';
const STORE_ID = '507f1f77bcf86cd799439012';

const CATEGORIES: PublicCategory[] = [{ id: CAT_ID, nombre: 'Semillas' }];
const STORES: Page<PublicStore> = {
  data: [{ id: STORE_ID, nombre: 'Tienda Verde', municipio: 'Rionegro' }],
  page: 1,
  limit: 100,
  total: 1,
  totalPages: 1,
};

function product(n: number, patch: Partial<Product> = {}): Product {
  return {
    id: `507f1f77bcf86cd7994390${String(10 + n)}`,
    storeId: STORE_ID,
    categoryId: CAT_ID,
    nombre: `Producto ${n}`,
    marca: `Marca ${n}`,
    fichaTecnica: {},
    requiresQuote: false,
    activo: true,
    ...patch,
  };
}

function page(data: Product[], extra: Partial<Page<Product>> = {}): Page<Product> {
  return { data, page: 1, limit: 12, total: data.length, totalPages: 1, ...extra };
}

describe('CatalogoList', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'catalogo', component: CatalogoList }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    // Lo pendiente (p. ej. tras navegar) se descarta: aquí no interesa su respuesta.
    http.match(() => true);
  });

  const productsReq = () => http.expectOne((r) => r.url === '/api/catalog/products');
  async function open(url: string) {
    await harness.navigateByUrl(url, CatalogoList);
    harness.detectChanges();
  }
  /** `rxResource` publica su valor en una microtarea: se espera a que la fixture se estabilice. */
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function flushAll(products: Page<Product>, categories = CATEGORIES) {
    http.expectOne('/api/catalog/categories').flush(categories);
    http.expectOne((r) => r.url === '/api/catalog/stores').flush(STORES);
    productsReq().flush(products);
    await settle();
  }
  const text = () => (harness.routeNativeElement as HTMLElement).textContent ?? '';

  it('pide los productos con page y limit, y sin filtros que no existen', async () => {
    await open('/catalogo');
    const req = productsReq();
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('12');
    req.flush(page([]));
  });

  it('lleva los filtros de la URL a la petición', async () => {
    await open(`/catalogo?categoryId=${CAT_ID}&municipio=Bello&page=3`);
    const req = productsReq();
    expect(req.request.params.get('categoryId')).toBe(CAT_ID);
    expect(req.request.params.get('municipio')).toBe('Bello');
    expect(req.request.params.get('page')).toBe('3');
  });

  it.each(['?page=0', '?page=abc', '?categoryId=xyz', '?municipio=', '?municipio=%20%20'])(
    'ignora el valor inválido %s',
    async (query) => {
      await open(`/catalogo${query}`);
      const req = productsReq();
      expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
      expect(req.request.params.get('page')).toBe('1');
    },
  );

  it('muestra un estado de carga con aria-busy mientras llegan los datos', async () => {
    await open('/catalogo');
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
  });

  it('muestra nombre, marca, categoría y tienda, sin precios ni carrito', async () => {
    await open('/catalogo');
    await flushAll(page([product(1), product(2, { requiresQuote: true })], { total: 2 }));
    const content = text();
    expect(content).toContain('Producto 1');
    expect(content).toContain('Marca 1');
    expect(content).toContain('Semillas');
    expect(content).toContain('Tienda Verde');
    expect(content).toContain('2 productos');
    expect(content).not.toContain('$');
    expect(content).not.toContain('Agregar al carrito');
  });

  it('un producto a cotizar muestra el badge "A cotizar"', async () => {
    await open('/catalogo');
    await flushAll(page([product(1), product(2, { requiresQuote: true })]));
    expect(text().match(/A cotizar/g)).toHaveLength(1);
  });

  it('si fallan categorías y tiendas igual muestra los productos', async () => {
    await open('/catalogo');
    http
      .expectOne('/api/catalog/categories')
      .flush('Error', { status: 500, statusText: 'Server Error' });
    http
      .expectOne((r) => r.url === '/api/catalog/stores')
      .flush('Error', { status: 500, statusText: 'Server Error' });
    productsReq().flush(page([product(1)]));
    await settle();
    expect(text()).toContain('Producto 1');
    expect(text()).not.toContain('Tienda Verde');
  });

  it('sin resultados y con filtros ofrece quitarlos', async () => {
    await open('/catalogo?municipio=Nowhere');
    await flushAll(page([], { total: 0, totalPages: 0 }));
    expect(text()).toContain('No hay productos con esos filtros');
    expect(text()).toContain('Quitar filtros');
  });

  it('una página fuera de rango muestra el vacío con enlace a la primera página', async () => {
    await open(`/catalogo?categoryId=${CAT_ID}&page=999`);
    await flushAll(page([], { page: 999, total: 0, totalPages: 0 }));
    expect(text()).toContain('Esta página no existe');
    const link = [...(harness.routeNativeElement as HTMLElement).querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Ir a la primera página'),
    );
    expect(link?.getAttribute('href')).toBe(`/catalogo?categoryId=${CAT_ID}`);
  });

  it('un error muestra el mensaje y Reintentar vuelve a pedir los productos', async () => {
    await open('/catalogo');
    http.expectOne('/api/catalog/categories').flush(CATEGORIES);
    http.expectOne((r) => r.url === '/api/catalog/stores').flush(STORES);
    productsReq().error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('[role="alert"]'),
    ).not.toBeNull();

    const retry = [...(harness.routeNativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Reintentar'),
    );
    retry?.click();
    // Con la petición en vuelo la fixture no se estabiliza (HttpClient es una tarea pendiente).
    const again: TestRequest = await vi.waitFor(() => productsReq());
    again.flush(page([product(1)]));
    await settle();
    expect(text()).toContain('Producto 1');
  });

  it('la paginación pone la página en la URL y conserva los filtros', async () => {
    await open(`/catalogo?categoryId=${CAT_ID}`);
    await flushAll(page([product(1)], { total: 30, totalPages: 3 }));
    const next = (harness.routeNativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Página siguiente"]',
    );
    next?.click();
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe(`/catalogo?categoryId=${CAT_ID}&page=2`),
    );
  });

  it('cambiar un filtro reinicia la página a 1', async () => {
    await open(`/catalogo?page=3`);
    await flushAll(page([product(1)], { page: 3, total: 40, totalPages: 4 }));
    const root = harness.routeNativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input')!;
    input.value = 'Bello';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Filtrar')?.click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/catalogo?municipio=Bello'));
  });
});
