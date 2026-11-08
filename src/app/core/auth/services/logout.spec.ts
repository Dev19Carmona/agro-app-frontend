import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { REFRESH_TOKEN_STORAGE_KEY } from '../models/auth.types';
import { LogoutService } from './logout';
import { SessionService } from './session';

describe('LogoutService', () => {
  let backend: HttpTestingController;
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    session.start(
      { accessToken: 'a', refreshToken: 'r' },
      { id: '1', email: 'a@agro.test', nombre: 'A', rol: 'PRODUCTOR', status: 'ACTIVE' },
    );
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('envía POST /auth/logout con el Bearer y luego borra la sesión', async () => {
    const done = TestBed.inject(LogoutService).logout();
    const req = backend.expectOne('/api/auth/logout');
    expect(session.isAuthenticated()).toBe(true); // aún no se borra: la petición va con el token
    req.flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(session.status()).toBe('anonymous');
    expect(session.getAccessToken()).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalogo');
  });

  it.each([0, 500])('borra la sesión local aunque el backend responda %i', async (status) => {
    const done = TestBed.inject(LogoutService).logout();
    const req = backend.expectOne('/api/auth/logout');
    if (status === 0) {
      req.error(new ProgressEvent('error'));
    } else {
      req.flush(null, { status, statusText: 'x' });
    }
    await done;

    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalogo');
  });
});
