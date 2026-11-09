import {
  USER_ROLES,
  USER_STATUSES,
  isUserRole,
  isUserStatus,
  userRoleLabel,
  userStatusLabel,
  userStatusTone,
} from './user-labels';

describe('user-labels', () => {
  it('cada estado tiene etiqueta en español y un tono', () => {
    expect(USER_STATUSES.map(userStatusLabel)).toEqual([
      'Pendiente de aprobación',
      'Activo',
      'Rechazado',
      'Deshabilitado',
    ]);
    expect(userStatusTone('PENDING_APPROVAL')).toBe('warning');
    expect(userStatusTone('ACTIVE')).toBe('success');
    expect(userStatusTone('REJECTED')).toBe('danger');
    expect(userStatusTone('DISABLED')).toBe('neutral');
  });

  it('cada rol tiene su etiqueta de la navegación', () => {
    expect(USER_ROLES.map(userRoleLabel)).toEqual(['Productor', 'Proveedor', 'Administrador']);
  });

  it('isUserStatus e isUserRole solo aceptan los valores del tipo', () => {
    expect(isUserStatus('ACTIVE')).toBe(true);
    expect(isUserStatus('active')).toBe(false);
    expect(isUserStatus(null)).toBe(false);
    expect(isUserRole('ADMIN')).toBe(true);
    expect(isUserRole('VISITANTE')).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});
