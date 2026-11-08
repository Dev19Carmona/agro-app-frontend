import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthUser, LoginResponse, REFRESH_TOKEN_STORAGE_KEY } from '../models/auth.types';
import { SessionRefresher } from './session-refresher';
import { SessionService } from './session';

const USER: AuthUser = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PROVEEDOR',
  status: 'ACTIVE',
};
const RESPONSE: LoginResponse = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: USER,
};

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve));

function setLocks(locks: unknown): void {
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
}

describe('SessionRefresher', () => {
  let refresher: SessionRefresher;
  let session: SessionService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    refresher = TestBed.inject(SessionRefresher);
    session = TestBed.inject(SessionService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    // jsdom no trae `navigator.locks`: se deja como estaba.
    Reflect.deleteProperty(navigator, 'locks');
    localStorage.clear();
  });

  describe('restore', () => {
    it('sin refresh token queda anónima sin llamar al backend', async () => {
      await refresher.restore();
      expect(session.status()).toBe('anonymous');
      backend.expectNone('/api/auth/refresh');
    });

    it('con refresh token válido restaura usuario y tokens', async () => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      const done = refresher.restore();
      await flushPromises();
      backend.expectOne('/api/auth/refresh').flush(RESPONSE);
      await done;

      expect(session.status()).toBe('authenticated');
      expect(session.role()).toBe('PROVEEDOR');
      expect(session.getAccessToken()).toBe('access-2');
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-2');
    });

    it.each([400, 401, 403])('con %i del backend borra el refresh token', async (status) => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      const done = refresher.restore();
      await flushPromises();
      backend.expectOne('/api/auth/refresh').flush({ message: 'no' }, { status, statusText: 'x' });
      await done;

      expect(session.status()).toBe('anonymous');
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    });

    it.each([0, 500, 503])('con error %i conserva el refresh token', async (status) => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      const done = refresher.restore();
      await flushPromises();
      const req = backend.expectOne('/api/auth/refresh');
      if (status === 0) {
        req.error(new ProgressEvent('error'));
      } else {
        req.flush(null, { status, statusText: 'x' });
      }
      await done;

      expect(session.status()).toBe('anonymous');
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
    });
  });

  describe('refresh', () => {
    it('llamadas simultáneas comparten un único POST', async () => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      const all = Promise.all([refresher.refresh(), refresher.refresh(), refresher.refresh()]);
      await flushPromises();
      backend.expectOne('/api/auth/refresh').flush(RESPONSE);
      await all;
      expect(session.getAccessToken()).toBe('access-2');
    });

    it('tras terminar, una nueva llamada hace otro refresh', async () => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      const first = refresher.refresh();
      await flushPromises();
      backend.expectOne('/api/auth/refresh').flush(RESPONSE);
      await first;

      const second = refresher.refresh();
      await flushPromises();
      const req = backend.expectOne('/api/auth/refresh');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-2' });
      req.flush({ ...RESPONSE, refreshToken: 'refresh-3' });
      await second;
    });

    it('sin refresh token rechaza con 401 sin llamar al backend', async () => {
      await expect(refresher.refresh()).rejects.toMatchObject({ status: 401 });
      backend.expectNone('/api/auth/refresh');
    });

    it('usa navigator.locks y relee el token dentro del bloqueo', async () => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-viejo');
      const request = vi.fn(async (_name: string, task: () => Promise<unknown>) => {
        // Mientras se esperaba el bloqueo, otra pestaña rotó el token.
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-de-otra-pestana');
        return task();
      });
      setLocks({ request });

      const done = refresher.refresh();
      await flushPromises();
      const req = backend.expectOne('/api/auth/refresh');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-de-otra-pestana' });
      req.flush(RESPONSE);
      await done;

      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toBe('agro:refresh-token');
    });

    it('sin navigator.locks refresca igualmente', async () => {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
      expect(navigator.locks).toBeUndefined();
      const done = refresher.refresh();
      await flushPromises();
      backend.expectOne('/api/auth/refresh').flush(RESPONSE);
      await done;
      expect(session.isAuthenticated()).toBe(true);
    });
  });
});
