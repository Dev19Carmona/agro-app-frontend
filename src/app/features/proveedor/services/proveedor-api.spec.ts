import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Page } from '../../../core/catalog';
import { ApiError } from '../../../core/http';
import { MyProduct } from '../models/proveedor.types';
import { ProveedorApi } from './proveedor-api';

const ID = '507f1f77bcf86cd799439011';
const OTHER = '507f1f77bcf86cd799439012';

function page(data: Partial<MyProduct>[], p = 1, totalPages = 1): Page<MyProduct> {
  return { data: data as MyProduct[], page: p, limit: 100, total: data.length, totalPages };
}

describe('ProveedorApi', () => {
  let api: ProveedorApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ProveedorApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getMyStore pide GET /api/catalog/my-store', () => {
    api.getMyStore().subscribe();
    const req = http.expectOne('/api/catalog/my-store');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('createStore hace POST /api/catalog/stores solo con nombre, nit y municipio', () => {
    const body = { nombre: 'Agro Sur', nit: '900123', municipio: 'Bello' };
    api.createStore(body).subscribe();
    const req = http.expectOne('/api/catalog/stores');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.body.storeId).toBeUndefined();
    req.flush({});
  });

  it('listMyProducts envía page y limit (10 por defecto)', () => {
    api.listMyProducts(3).subscribe();
    const req = http.expectOne((r) => r.url === '/api/catalog/my-store/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(page([]));
  });

  describe('getMyProduct', () => {
    it('devuelve el producto de la primera página con una sola petición', () => {
      let result: MyProduct | undefined;
      api.getMyProduct(ID).subscribe((p) => (result = p));
      const req = http.expectOne((r) => r.url === '/api/catalog/my-store/products');
      expect(req.request.params.get('limit')).toBe('100');
      req.flush(page([{ id: OTHER }, { id: ID, nombre: 'Abono' }], 1, 3));
      expect(result?.nombre).toBe('Abono');
    });

    it('recorre las páginas hasta encontrarlo', () => {
      let result: MyProduct | undefined;
      api.getMyProduct(ID).subscribe((p) => (result = p));
      http.expectOne((r) => r.params.get('page') === '1').flush(page([{ id: OTHER }], 1, 2));
      http
        .expectOne((r) => r.params.get('page') === '2')
        .flush(page([{ id: ID, nombre: 'Semilla' }], 2, 2));
      expect(result?.nombre).toBe('Semilla');
    });

    it('si no está en ninguna página responde 404', () => {
      let error: ApiError | undefined;
      api.getMyProduct(ID).subscribe({ error: (e: ApiError) => (error = e) });
      http.expectOne((r) => r.params.get('page') === '1').flush(page([{ id: OTHER }], 1, 2));
      http.expectOne((r) => r.params.get('page') === '2').flush(page([], 2, 2));
      expect(error).toEqual({ status: 404, message: 'Producto no encontrado' });
    });

    it('un id con formato inválido responde 404 sin pedir nada', () => {
      let error: ApiError | undefined;
      api.getMyProduct('abc').subscribe({ error: (e: ApiError) => (error = e) });
      expect(error?.status).toBe(404);
      http.expectNone(() => true);
    });
  });

  it('createProduct hace POST /api/catalog/products', () => {
    const body = { categoryId: ID, nombre: 'Abono', marca: 'Agro', fichaTecnica: { N: '10' } };
    api.createProduct(body).subscribe();
    const req = http.expectOne('/api/catalog/products');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updateProduct hace PATCH /api/catalog/products/:id con activo', () => {
    api.updateProduct(ID, { activo: false }).subscribe();
    const req = http.expectOne(`/api/catalog/products/${ID}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({});
  });

  it('createVariant hace POST /api/catalog/products/:id/variants', () => {
    const body = { presentacion: 'Bulto', unidad: '50kg', precio: 90000, stock: 5 };
    api.createVariant(ID, body).subscribe();
    const req = http.expectOne(`/api/catalog/products/${ID}/variants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updateVariant envía precioOferta: null para quitar la oferta', () => {
    api.updateVariant(ID, { precioOferta: null }).subscribe();
    const req = http.expectOne(`/api/catalog/variants/${ID}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ precioOferta: null });
    req.flush({});
  });

  it('setStock hace PATCH /variants/:id/stock con el valor absoluto', () => {
    api.setStock(ID, 42).subscribe();
    const req = http.expectOne(`/api/catalog/variants/${ID}/stock`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stock: 42 });
    req.flush({});
  });

  it('listSubOrders y getSubOrder usan /api/orders/provider/sub-orders', () => {
    api.listSubOrders(2).subscribe();
    const list = http.expectOne((r) => r.url === '/api/orders/provider/sub-orders');
    expect(list.request.method).toBe('GET');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('limit')).toBe('10');
    list.flush(page([]));

    api.getSubOrder(ID).subscribe();
    http.expectOne(`/api/orders/provider/sub-orders/${ID}`).flush({});
  });

  it('propaga los errores como ApiError con el mensaje del backend', () => {
    let error: ApiError | undefined;
    api.createStore({ nombre: 'a', nit: '1', municipio: 'b' }).subscribe({
      error: (e: ApiError) => (error = e),
    });
    http
      .expectOne('/api/catalog/stores')
      .flush(
        { statusCode: 409, message: 'El NIT ya existe' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(error).toEqual({ status: 409, message: 'El NIT ya existe' });
  });

  it('sin respuesta del servidor el error tiene status 0', () => {
    let error: ApiError | undefined;
    api.getMyStore().subscribe({ error: (e: ApiError) => (error = e) });
    http.expectOne('/api/catalog/my-store').error(new ProgressEvent('error'));
    expect(error?.status).toBe(0);
  });
});
