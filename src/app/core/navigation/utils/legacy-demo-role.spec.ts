import { clearLegacyDemoRole } from './legacy-demo-role';

describe('clearLegacyDemoRole', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('borra agro:demo-role y respeta el resto de claves', () => {
    localStorage.setItem('agro:demo-role', 'ADMIN');
    localStorage.setItem('agro:theme', 'dark');
    clearLegacyDemoRole();
    expect(localStorage.getItem('agro:demo-role')).toBeNull();
    expect(localStorage.getItem('agro:theme')).toBe('dark');
  });

  it('no falla si no existe la clave', () => {
    expect(() => clearLegacyDemoRole()).not.toThrow();
  });

  it('no falla si el almacenamiento lanza o no existe', () => {
    const broken = {
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() => clearLegacyDemoRole(broken)).not.toThrow();
    expect(() => clearLegacyDemoRole(null)).not.toThrow();
  });
});
