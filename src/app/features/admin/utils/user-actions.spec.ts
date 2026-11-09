import { AdminUser } from '../models/admin.types';
import { userActions } from './user-actions';

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 'u1',
    email: 'ana@correo.com',
    nombre: 'Ana',
    documento: '1234567',
    rol: 'PRODUCTOR',
    status: 'ACTIVE',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const NONE = {
  approve: false,
  reject: false,
  disable: false,
  enable: false,
  changeRole: false,
  selfNote: false,
};

describe('userActions', () => {
  it('un proveedor pendiente se aprueba o rechaza, y no se deshabilita ni se le cambia el rol', () => {
    expect(userActions(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }), 'admin')).toEqual({
      ...NONE,
      approve: true,
      reject: true,
    });
  });

  it('un productor pendiente no ofrece ninguna acción', () => {
    expect(userActions(user({ rol: 'PRODUCTOR', status: 'PENDING_APPROVAL' }), 'admin')).toEqual(
      NONE,
    );
  });

  it('una cuenta activa se deshabilita y se le cambia el rol', () => {
    expect(userActions(user({ status: 'ACTIVE' }), 'admin')).toEqual({
      ...NONE,
      disable: true,
      changeRole: true,
    });
  });

  it('una cuenta deshabilitada se habilita y se le cambia el rol', () => {
    expect(userActions(user({ status: 'DISABLED' }), 'admin')).toEqual({
      ...NONE,
      enable: true,
      changeRole: true,
    });
  });

  it('una cuenta rechazada no ofrece ninguna acción', () => {
    expect(userActions(user({ rol: 'PROVEEDOR', status: 'REJECTED' }), 'admin')).toEqual(NONE);
  });

  it('el administrador actual no puede deshabilitarse ni cambiarse el rol: ve la nota', () => {
    expect(userActions(user({ id: 'admin', rol: 'ADMIN', status: 'ACTIVE' }), 'admin')).toEqual({
      ...NONE,
      selfNote: true,
    });
  });

  it('otro administrador activo sí se puede deshabilitar', () => {
    expect(userActions(user({ id: 'otro', rol: 'ADMIN', status: 'ACTIVE' }), 'admin')).toEqual({
      ...NONE,
      disable: true,
      changeRole: true,
    });
  });

  it('sin sesión conocida no se aplica la autoprotección', () => {
    expect(userActions(user({ id: 'admin' }), null).disable).toBe(true);
  });
});
