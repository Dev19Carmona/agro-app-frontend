import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';
import { DARK_CLASS, THEME_STORAGE_KEY } from './theme.types';

type Listener = (event: MediaQueryListEvent) => void;

/** Simula `prefers-color-scheme` y permite disparar el cambio del sistema. */
function mockSystemScheme(initialDark: boolean) {
  let listener: Listener | null = null;
  const query = {
    matches: initialDark,
    addEventListener: (_: string, fn: Listener) => (listener = fn),
    removeEventListener: () => (listener = null),
  };
  window.matchMedia = vi.fn().mockReturnValue(query) as unknown as typeof window.matchMedia;
  return {
    change(matches: boolean) {
      query.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
}

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    html.classList.remove(DARK_CLASS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    html.classList.remove(DARK_CLASS);
  });

  function create(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('usa "system" por defecto y sigue prefers-color-scheme (claro)', () => {
    mockSystemScheme(false);
    const service = create();
    expect(service.mode()).toBe('system');
    expect(service.effective()).toBe('light');
    expect(html.classList.contains(DARK_CLASS)).toBe(false);
  });

  it('con "system" y sistema oscuro aplica la clase app-dark', () => {
    mockSystemScheme(true);
    const service = create();
    expect(service.effective()).toBe('dark');
    expect(html.classList.contains(DARK_CLASS)).toBe(true);
  });

  it('reacciona al cambio del sistema solo en modo "system"', () => {
    const system = mockSystemScheme(false);
    const service = create();

    system.change(true);
    TestBed.tick();
    expect(html.classList.contains(DARK_CLASS)).toBe(true);

    service.setMode('light');
    TestBed.tick();
    system.change(true);
    TestBed.tick();
    expect(service.effective()).toBe('light');
    expect(html.classList.contains(DARK_CLASS)).toBe(false);
  });

  it('setMode cambia el tema aplicado y persiste la preferencia', () => {
    mockSystemScheme(false);
    const service = create();

    service.setMode('dark');
    TestBed.tick();
    expect(service.effective()).toBe('dark');
    expect(html.classList.contains(DARK_CLASS)).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.setMode('light');
    TestBed.tick();
    expect(html.classList.contains(DARK_CLASS)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('recupera la preferencia guardada al iniciar', () => {
    mockSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = create();
    expect(service.mode()).toBe('dark');
    expect(html.classList.contains(DARK_CLASS)).toBe(true);
  });

  it('ignora un valor guardado no válido', () => {
    mockSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'azul');
    expect(create().mode()).toBe('system');
  });

  it('ignora un modo no válido en setMode', () => {
    mockSystemScheme(false);
    const service = create();
    service.setMode('azul' as never);
    expect(service.mode()).toBe('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('funciona aunque localStorage lance error', () => {
    mockSystemScheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const service = create();
    expect(service.mode()).toBe('system');

    service.setMode('dark');
    TestBed.tick();
    expect(service.mode()).toBe('dark');
    expect(html.classList.contains(DARK_CLASS)).toBe(true);
  });

  it('funciona sin matchMedia', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const service = create();
    expect(service.effective()).toBe('light');
  });
});
