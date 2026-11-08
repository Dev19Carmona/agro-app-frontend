import { TestBed } from '@angular/core/testing';
import { DemoRoleService } from './demo-role';
import { DEMO_ROLE_STORAGE_KEY } from './navigation.types';

describe('DemoRoleService', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('usa VISITANTE por defecto', () => {
    expect(TestBed.inject(DemoRoleService).role()).toBe('VISITANTE');
  });

  it('setRole cambia el rol y lo persiste', () => {
    const service = TestBed.inject(DemoRoleService);
    service.setRole('PROVEEDOR');
    expect(service.role()).toBe('PROVEEDOR');
    expect(localStorage.getItem(DEMO_ROLE_STORAGE_KEY)).toBe('PROVEEDOR');
  });

  it('recupera el rol guardado al iniciar', () => {
    localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'ADMIN');
    expect(TestBed.inject(DemoRoleService).role()).toBe('ADMIN');
  });

  it('ignora un valor guardado no válido', () => {
    localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'SUPERUSUARIO');
    expect(TestBed.inject(DemoRoleService).role()).toBe('VISITANTE');
  });

  it('ignora un rol no válido en setRole', () => {
    const service = TestBed.inject(DemoRoleService);
    service.setRole('SUPERUSUARIO' as never);
    expect(service.role()).toBe('VISITANTE');
    expect(localStorage.getItem(DEMO_ROLE_STORAGE_KEY)).toBeNull();
  });

  it('funciona aunque localStorage lance error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const service = TestBed.inject(DemoRoleService);
    expect(service.role()).toBe('VISITANTE');
    service.setRole('PRODUCTOR');
    expect(service.role()).toBe('PRODUCTOR');
  });
});
