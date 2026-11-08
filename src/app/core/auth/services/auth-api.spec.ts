import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../http/api-error';
import { toApiError } from '../http/to-api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from './auth-api';
import { AuthUser, LoginResponse } from './auth.types';

const USER: AuthUser = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PRODUCTOR',
  status: 'ACTIVE',
};
const LOGIN: LoginResponse = {
  accessToken: 'a',
  refreshToken: 'r',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: USER,
};

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login hace POST /api/auth/login con las credenciales', () => {
    let result: LoginResponse | undefined;
    api.login({ email: 'ana@agro.test', password: 'Clave12345' }).subscribe((r) => (result = r));
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@agro.test', password: 'Clave12345' });
    req.flush(LOGIN);
    expect(result).toEqual(LOGIN);
  });

  it('register hace POST /api/auth/register', () => {
    const body = {
      email: 'ana@agro.test',
      password: 'Clave12345',
      nombre: 'Ana',
      documento: 'ABC-12345',
      rol: 'PRODUCTOR' as const,
      aceptaTratamientoDatos: true as const,
    };
    let result: AuthUser | undefined;
    api.register(body).subscribe((r) => (result = r));
    const req = http.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(USER);
    expect(result).toEqual(USER);
  });

  it('refresh envía { refreshToken }', () => {
    api.refresh('r-1').subscribe();
    const req = http.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'r-1' });
    req.flush(LOGIN);
  });

  it('logout hace POST /api/auth/logout sin cuerpo', () => {
    let done = false;
    api.logout().subscribe(() => (done = true));
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('me hace GET /api/auth/me', () => {
    let result: unknown;
    api.me().subscribe((r) => (result = r));
    const req = http.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({ ...USER, storeId: 's1' });
    expect(result).toEqual({ ...USER, storeId: 's1' });
  });

  it('changePassword hace POST /api/auth/change-password', () => {
    api.changePassword({ currentPassword: 'a', newPassword: 'b' }).subscribe();
    const req = http.expectOne('/api/auth/change-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'a', newPassword: 'b' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('un 401 sale como ApiError con el message del backend', () => {
    let error: ApiError | undefined;
    api.login({ email: 'a', password: 'b' }).subscribe({ error: (e: ApiError) => (error = e) });
    http
      .expectOne('/api/auth/login')
      .flush(
        { statusCode: 401, message: 'Credenciales inválidas', error: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(error).toEqual({ status: 401, message: 'Credenciales inválidas' });
  });

  it('un fallo de red sale como status 0', () => {
    let error: ApiError | undefined;
    api.me().subscribe({ error: (e: ApiError) => (error = e) });
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'));
    expect(error).toEqual({ status: 0, message: 'No se pudo conectar con el servidor' });
  });
});

describe('toApiError', () => {
  function httpError(status: number, body: unknown) {
    return new HttpErrorResponse({ status, error: body });
  }

  it('aplana un message string[] de validación', () => {
    const error = toApiError(httpError(400, { message: ['Uno', 'Dos'] }));
    expect(error).toEqual({ status: 400, message: 'Uno. Dos' });
  });

  it('usa un mensaje genérico si el cuerpo no trae message', () => {
    expect(toApiError(httpError(500, null)).message).toBe('Ocurrió un error inesperado');
    expect(toApiError(httpError(500, 'Fallo de texto')).message).toBe('Fallo de texto');
    expect(toApiError(httpError(404, '<!DOCTYPE html><pre>Cannot POST /api/x</pre>')).message).toBe(
      'Ocurrió un error inesperado',
    );
    expect(toApiError(httpError(500, { message: [] })).message).toBe('Ocurrió un error inesperado');
  });

  it.each([502, 503, 504])('un %i del proxy se trata como sin conexión (status 0)', (status) => {
    expect(toApiError(httpError(status, 'Bad Gateway'))).toEqual({
      status: 0,
      message: 'No se pudo conectar con el servidor',
    });
  });

  it('un valor que no es HttpErrorResponse se trata como sin conexión', () => {
    expect(toApiError(new Error('x'))).toEqual({
      status: 0,
      message: 'No se pudo conectar con el servidor',
    });
  });
});
