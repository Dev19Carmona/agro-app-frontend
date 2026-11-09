import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Page, Product } from '../../../core/catalog';
import { ApiError } from '../../../core/http';
import { CatalogoApi } from './catalogo-api';

const ID = '507f1f77bcf86cd799439011';
const EMPTY: Page<never> = { data: [], page: 1, limit: 12, total: 0, totalPages: 0 };

describe('CatalogoApi', () => {
  let api: CatalogoApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CatalogoApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listProducts pide /api/catalog/products con limit y page', () => {
    api.listProducts({ page: 1 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('12');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush(EMPTY);
  });

  it('listProducts envía los filtros que tienen valor', () => {
    api.listProducts({ categoryId: ID, storeId: ID, municipio: 'Bello', page: 3 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/products');
    expect(req.request.params.get('categoryId')).toBe(ID);
    expect(req.request.params.get('storeId')).toBe(ID);
    expect(req.request.params.get('municipio')).toBe('Bello');
    expect(req.request.params.get('page')).toBe('3');
    req.flush(EMPTY);
  });

  it('no envía filtros vacíos ni undefined (el backend los rechazaría con 400)', () => {
    api.listProducts({ categoryId: undefined, municipio: '', page: 2 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/products');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush(EMPTY);
  });

  it('devuelve el cuerpo de la respuesta', () => {
    const product = { id: ID, nombre: 'Abono' } as Product;
    let result: Page<Product> | undefined;
    api.listProducts({ page: 1 }).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === '/api/catalog/products')
      .flush({ ...EMPTY, data: [product], total: 1, totalPages: 1 });
    expect(result?.data).toEqual([product]);
  });

  it('getProduct pide /api/catalog/products/:id', () => {
    api.getProduct(ID).subscribe();
    const req = http.expectOne(`/api/catalog/products/${ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getProduct codifica el id en la URL', () => {
    api.getProduct('a/b').subscribe();
    http.expectOne('/api/catalog/products/a%2Fb').flush({});
  });

  it('listOffers pide /api/catalog/offers con page y limit', () => {
    api.listOffers(2).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/offers');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('12');
    req.flush(EMPTY);
  });

  it('listStores pide /api/catalog/stores con municipio y page', () => {
    api.listStores({ municipio: 'Bello', page: 2 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/stores');
    expect(req.request.params.get('municipio')).toBe('Bello');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(EMPTY);
  });

  it('listStoreNames pide las tiendas con limit=100 y solo page', () => {
    api.listStoreNames().subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/stores');
    expect(req.request.params.get('limit')).toBe('100');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush(EMPTY);
  });

  it('getStore pide /api/catalog/stores/:id', () => {
    api.getStore(ID).subscribe();
    http.expectOne(`/api/catalog/stores/${ID}`).flush({ id: ID, nombre: 'T', municipio: 'M' });
  });

  it('listCategories pide /api/catalog/categories', () => {
    let result: unknown;
    api.listCategories().subscribe((r) => (result = r));
    http.expectOne('/api/catalog/categories').flush([{ id: ID, nombre: 'Semillas' }]);
    expect(result).toEqual([{ id: ID, nombre: 'Semillas' }]);
  });

  it('un 404 sale como ApiError con el message del backend', () => {
    let error: ApiError | undefined;
    api.getProduct(ID).subscribe({ error: (e: ApiError) => (error = e) });
    http
      .expectOne(`/api/catalog/products/${ID}`)
      .flush(
        { statusCode: 404, message: 'Producto no encontrado', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(error).toEqual({ status: 404, message: 'Producto no encontrado' });
  });

  it('un fallo de red sale como status 0', () => {
    let error: ApiError | undefined;
    api.listCategories().subscribe({ error: (e: ApiError) => (error = e) });
    http.expectOne('/api/catalog/categories').error(new ProgressEvent('error'));
    expect(error).toEqual({ status: 0, message: 'No se pudo conectar con el servidor' });
  });

  it('un 502 del proxy (backend apagado) sale como status 0', () => {
    let error: ApiError | undefined;
    api.listCategories().subscribe({ error: (e: ApiError) => (error = e) });
    http
      .expectOne('/api/catalog/categories')
      .flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    expect(error?.status).toBe(0);
  });
});
