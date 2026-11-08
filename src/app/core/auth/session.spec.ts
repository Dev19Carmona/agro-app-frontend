import { TestBed } from '@angular/core/testing';
import { AuthUser, REFRESH_TOKEN_STORAGE_KEY } from './auth.types';
import { SessionService } from './session';

const USER: AuthUser = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PRODUCTOR',
  status: 'ACTIVE',
};
const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('SessionService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('arranca restaurando y como visitante', () => {
    const session = TestBed.inject(SessionService);
    expect(session.status()).toBe('restoring');
    expect(session.user()).toBeNull();
    expect(session.role()).toBe('VISITANTE');
    expect(session.isAuthenticated()).toBe(false);
  });

  it('start guarda usuario, rol y tokens', () => {
    const session = TestBed.inject(SessionService);
    session.start(TOKENS, USER);
    expect(session.status()).toBe('authenticated');
    expect(session.isAuthenticated()).toBe(true);
    expect(session.role()).toBe('PRODUCTOR');
    expect(session.getAccessToken()).toBe('access-1');
    expect(session.getRefreshToken()).toBe('refresh-1');
  });

  it('el access token nunca se escribe en el almacenamiento', () => {
    const session = TestBed.inject(SessionService);
    session.start(TOKENS, USER);
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('access-1');
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
  });

  it('updateTokens rota los tokens y conserva al usuario', () => {
    const session = TestBed.inject(SessionService);
    session.start(TOKENS, USER);
    session.updateTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(session.getAccessToken()).toBe('access-2');
    expect(session.getRefreshToken()).toBe('refresh-2');
    expect(session.user()).toEqual(USER);
  });

  it('clear borra tokens y usuario y deja la sesión anónima', () => {
    const session = TestBed.inject(SessionService);
    session.start(TOKENS, USER);
    session.clear();
    expect(session.status()).toBe('anonymous');
    expect(session.role()).toBe('VISITANTE');
    expect(session.getAccessToken()).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('markAnonymous conserva el refresh token', () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');
    const session = TestBed.inject(SessionService);
    session.markAnonymous();
    expect(session.status()).toBe('anonymous');
    expect(session.getRefreshToken()).toBe('refresh-1');
  });

  it('sobrevive a un almacenamiento que lanza', () => {
    const fail = () => {
      throw new Error('bloqueado');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);
    const session = TestBed.inject(SessionService);
    expect(session.getRefreshToken()).toBeNull();
    session.start(TOKENS, USER);
    expect(session.isAuthenticated()).toBe(true);
    expect(() => session.clear()).not.toThrow();
  });
});
