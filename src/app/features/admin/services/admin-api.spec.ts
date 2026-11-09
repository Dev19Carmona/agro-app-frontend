import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../../core/http';
import { AdminApi } from './admin-api';

const ID = '0123456789abcdef01234567';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(AdminApi), http: TestBed.inject(HttpTestingController) };
}

describe('AdminApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('usuarios', () => {
    it('listUsers envía page y limit, y solo los filtros con valor', () => {
      const { api, http } = setup();
      api.listUsers({ page: 2 }).subscribe();
      const req = http.expectOne((r) => r.url === '/api/auth/users');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.has('rol')).toBe(false);
      expect(req.request.params.has('status')).toBe(false);
      req.flush({ data: [], page: 2, limit: 10, total: 0, totalPages: 0 });
    });

    it('listUsers envía rol y status', () => {
      const { api, http } = setup();
      api.listUsers({ page: 1, rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }).subscribe();
      const req = http.expectOne((r) => r.url === '/api/auth/users');
      expect(req.request.params.get('rol')).toBe('PROVEEDOR');
      expect(req.request.params.get('status')).toBe('PENDING_APPROVAL');
      req.flush({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });
    });

    it('getUser pide GET /auth/users/:id', () => {
      const { api, http } = setup();
      api.getUser(ID).subscribe();
      const req = http.expectOne(`/api/auth/users/${ID}`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it.each([
      ['approveUser', 'approve'],
      ['disableUser', 'disable'],
      ['enableUser', 'enable'],
    ] as const)('%s hace POST /auth/users/:id/%s con cuerpo vacío', (method, path) => {
      const { api, http } = setup();
      api[method](ID).subscribe();
      const req = http.expectOne(`/api/auth/users/${ID}/${path}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('rejectUser envía el motivo recortado', () => {
      const { api, http } = setup();
      api.rejectUser(ID, '  Documento ilegible ').subscribe();
      const req = http.expectOne(`/api/auth/users/${ID}/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Documento ilegible' });
      req.flush({});
    });

    it.each([undefined, '', '   '])('rejectUser omite el motivo %j', (reason) => {
      const { api, http } = setup();
      api.rejectUser(ID, reason).subscribe();
      const req = http.expectOne(`/api/auth/users/${ID}/reject`);
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('changeUserRole hace PATCH /auth/users/:id/role con { rol }', () => {
      const { api, http } = setup();
      api.changeUserRole(ID, 'PROVEEDOR').subscribe();
      const req = http.expectOne(`/api/auth/users/${ID}/role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ rol: 'PROVEEDOR' });
      req.flush({});
    });
  });

  describe('categorías', () => {
    it('listCategories pide GET /catalog/admin/categories', () => {
      const { api, http } = setup();
      api.listCategories().subscribe();
      const req = http.expectOne('/api/catalog/admin/categories');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('createCategory hace POST /catalog/categories con { nombre }', () => {
      const { api, http } = setup();
      api.createCategory('Granos').subscribe();
      const req = http.expectOne('/api/catalog/categories');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nombre: 'Granos' });
      req.flush({});
    });

    it('updateCategory hace PATCH con solo los campos recibidos', () => {
      const { api, http } = setup();
      api.updateCategory(ID, { activa: false }).subscribe();
      const req = http.expectOne(`/api/catalog/categories/${ID}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ activa: false });
      req.flush({});
    });
  });

  describe('tiendas', () => {
    it('listStores envía el municipio solo si tiene valor', () => {
      const { api, http } = setup();
      api.listStores({ page: 1 }).subscribe();
      const first = http.expectOne((r) => r.url === '/api/catalog/admin/stores');
      expect(first.request.params.has('municipio')).toBe(false);
      first.flush({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });

      api.listStores({ page: 3, municipio: 'Pasto' }).subscribe();
      const second = http.expectOne((r) => r.url === '/api/catalog/admin/stores');
      expect(second.request.params.get('municipio')).toBe('Pasto');
      expect(second.request.params.get('page')).toBe('3');
      second.flush({ data: [], page: 3, limit: 10, total: 0, totalPages: 0 });
    });

    it('getStore, updateStore y deactivateStore usan /catalog/admin/stores/:id', () => {
      const { api, http } = setup();
      api.getStore(ID).subscribe();
      const get = http.expectOne(`/api/catalog/admin/stores/${ID}`);
      expect(get.request.method).toBe('GET');
      get.flush({});

      api.updateStore(ID, { nombre: 'Nueva' }).subscribe();
      const patch = http.expectOne(`/api/catalog/admin/stores/${ID}`);
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ nombre: 'Nueva' });
      patch.flush({});

      api.deactivateStore(ID).subscribe();
      const post = http.expectOne(`/api/catalog/admin/stores/${ID}/deactivate`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({});
      post.flush({});
    });
  });

  describe('pedidos y pagos', () => {
    it('listOrders envía status y buyerId solo si tienen valor', () => {
      const { api, http } = setup();
      api.listOrders({ page: 1, status: 'CONFIRMED', buyerId: ID }).subscribe();
      const req = http.expectOne((r) => r.url === '/api/orders/admin');
      expect(req.request.params.get('status')).toBe('CONFIRMED');
      expect(req.request.params.get('buyerId')).toBe(ID);
      req.flush({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });
    });

    it('getOrder pide GET /orders/admin/:id', () => {
      const { api, http } = setup();
      api.getOrder(ID).subscribe();
      http.expectOne(`/api/orders/admin/${ID}`).flush({});
    });

    it('listPayments envía status, buyerId y orderId solo si tienen valor', () => {
      const { api, http } = setup();
      api.listPayments({ page: 1 }).subscribe();
      const first = http.expectOne((r) => r.url === '/api/payments/admin');
      expect(first.request.params.keys().sort()).toEqual(['limit', 'page']);
      first.flush({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });

      api.listPayments({ page: 2, status: 'DECLINED', buyerId: ID, orderId: ID }).subscribe();
      const second = http.expectOne((r) => r.url === '/api/payments/admin');
      expect(second.request.params.get('status')).toBe('DECLINED');
      expect(second.request.params.get('buyerId')).toBe(ID);
      expect(second.request.params.get('orderId')).toBe(ID);
      second.flush({ data: [], page: 2, limit: 10, total: 0, totalPages: 0 });
    });

    it('getPayment pide GET /payments/admin/:id', () => {
      const { api, http } = setup();
      api.getPayment(ID).subscribe();
      http.expectOne(`/api/payments/admin/${ID}`).flush({});
    });
  });

  describe('errores', () => {
    it('un 409 sale como ApiError con el mensaje del backend', () => {
      const { api, http } = setup();
      let error: ApiError | undefined;
      api.createCategory('Granos').subscribe({ error: (e: ApiError) => (error = e) });
      http
        .expectOne('/api/catalog/categories')
        .flush(
          { statusCode: 409, message: 'La categoría ya existe', error: 'Conflict' },
          { status: 409, statusText: 'Conflict' },
        );
      expect(error?.status).toBe(409);
      expect(error?.message).toBe('La categoría ya existe');
    });

    it('un 429 conserva su estado', () => {
      const { api, http } = setup();
      let error: ApiError | undefined;
      api.listPayments({ page: 1 }).subscribe({ error: (e: ApiError) => (error = e) });
      http
        .expectOne((r) => r.url === '/api/payments/admin')
        .flush({ statusCode: 429, message: 'Too Many Requests' }, { status: 429, statusText: 'x' });
      expect(error?.status).toBe(429);
    });

    it('sin red (502 del proxy) sale con status 0', () => {
      const { api, http } = setup();
      let error: ApiError | undefined;
      api.getUser(ID).subscribe({ error: (e: ApiError) => (error = e) });
      http
        .expectOne(`/api/auth/users/${ID}`)
        .error(new ProgressEvent('error'), { status: 0 } as Partial<HttpErrorResponse>);
      expect(error?.status).toBe(0);
    });
  });
});
