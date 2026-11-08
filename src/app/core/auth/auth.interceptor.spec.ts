import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthUser, LoginResponse, REFRESH_TOKEN_STORAGE_KEY } from './auth.types';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session';

const USER: AuthUser = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PRODUCTOR',
  status: 'ACTIVE',
};

function login(n: number): LoginResponse {
  return {
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    tokenType: 'Bearer',
    expiresIn: 900,
    user: USER,
  };
}

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

/** Deja correr las promesas pendientes (el refresh es asíncrono). */
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin sesión no añade Authorization y un 401 no dispara refresh ni redirección', async () => {
    let status = 0;
    http.get('/api/catalog/products').subscribe({ error: (e) => (status = e.status) });
    const req = backend.expectOne('/api/catalog/products');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, UNAUTHORIZED);
    await flushPromises();
    expect(status).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('con sesión añade el Bearer a las peticiones de la API', () => {
    session.start(login(1), USER);
    http.get('/api/auth/me').subscribe();
    const req = backend.expectOne('/api/auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it.each(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'])(
    'no añade Authorization a %s aunque haya sesión',
    (url) => {
      session.start(login(1), USER);
      http.post(url, {}).subscribe();
      const req = backend.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    },
  );

  it('nunca añade Authorization a otros orígenes ni a rutas que solo se parecen a la API', () => {
    session.start(login(1), USER);
    for (const url of ['https://otro.test/api/x', 'http://localhost:3000/auth/me', '/apix/y']) {
      http.get(url).subscribe();
      const req = backend.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });

  it('ante 401 renueva una vez y reintenta con el token nuevo', async () => {
    session.start(login(1), USER);
    let result: unknown;
    http.get('/api/orders').subscribe((r) => (result = r));

    backend.expectOne('/api/orders').flush(null, UNAUTHORIZED);
    await flushPromises();

    const refresh = backend.expectOne('/api/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush(login(2));
    await flushPromises();

    const retry = backend.expectOne('/api/orders');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-2');
  });

  it('con varias peticiones simultáneas hace un solo refresh y reintenta todas', async () => {
    session.start(login(1), USER);
    const results: unknown[] = [];
    for (const url of ['/api/a', '/api/b', '/api/c']) {
      http.get(url).subscribe((r) => results.push(r));
    }

    for (const url of ['/api/a', '/api/b', '/api/c']) {
      backend.expectOne(url).flush(null, UNAUTHORIZED);
    }
    await flushPromises();

    backend.expectOne('/api/auth/refresh').flush(login(2)); // expectOne falla si hay más de uno
    await flushPromises();

    for (const url of ['/api/a', '/api/b', '/api/c']) {
      const retry = backend.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
      retry.flush(url);
    }
    expect(results).toEqual(['/api/a', '/api/b', '/api/c']);
  });

  it('un 401 que llega con el token ya renovado se reintenta sin otro refresh', async () => {
    session.start(login(1), USER);
    http.get('/api/a').subscribe();
    const late = backend.expectOne('/api/a');
    session.updateTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    late.flush(null, UNAUTHORIZED);
    await flushPromises();

    const retry = backend.expectOne('/api/a');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({});
    backend.expectNone('/api/auth/refresh');
  });

  it('si el refresh falla con 401 borra la sesión, propaga el error y manda a login', async () => {
    session.start(login(1), USER);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/pedidos/7');
    let status = 0;
    http.get('/api/orders').subscribe({ error: (e) => (status = e.status) });

    backend.expectOne('/api/orders').flush(null, UNAUTHORIZED);
    await flushPromises();
    backend
      .expectOne('/api/auth/refresh')
      .flush({ message: 'Refresh token inválido' }, UNAUTHORIZED);
    await flushPromises();

    expect(status).toBe(401);
    expect(session.status()).toBe('anonymous');
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/pedidos/7', aviso: 'sesion' },
    });
  });

  it('con varias peticiones y refresh fallido redirige una sola vez', async () => {
    session.start(login(1), USER);
    for (const url of ['/api/a', '/api/b']) {
      http.get(url).subscribe({ error: () => undefined });
    }
    for (const url of ['/api/a', '/api/b']) {
      backend.expectOne(url).flush(null, UNAUTHORIZED);
    }
    await flushPromises();
    backend.expectOne('/api/auth/refresh').flush(null, UNAUTHORIZED);
    await flushPromises();

    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('si el refresh falla por red conserva la sesión y el refresh token', async () => {
    session.start(login(1), USER);
    let status = -1;
    http.get('/api/orders').subscribe({ error: (e) => (status = e.status) });

    backend.expectOne('/api/orders').flush(null, UNAUTHORIZED);
    await flushPromises();
    backend.expectOne('/api/auth/refresh').error(new ProgressEvent('error'));
    await flushPromises();

    expect(status).toBe(401);
    expect(session.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un segundo 401 tras el reintento se propaga sin otro refresh', async () => {
    session.start(login(1), USER);
    let status = 0;
    http.get('/api/orders').subscribe({ error: (e) => (status = e.status) });

    backend.expectOne('/api/orders').flush(null, UNAUTHORIZED);
    await flushPromises();
    backend.expectOne('/api/auth/refresh').flush(login(2));
    await flushPromises();
    backend.expectOne('/api/orders').flush(null, UNAUTHORIZED);
    await flushPromises();

    expect(status).toBe(401);
    backend.expectNone('/api/auth/refresh');
  });
});
