import { notificationsErrorMessage } from './notifications-messages';

describe('notificationsErrorMessage', () => {
  it('sin conexión', () => {
    expect(notificationsErrorMessage({ status: 0, message: 'x' })).toBe(
      'No se pudo conectar con el servidor',
    );
  });

  it('429', () => {
    expect(notificationsErrorMessage({ status: 429, message: 'x' })).toBe(
      'Demasiados intentos, espera un minuto',
    );
  });

  it('503', () => {
    expect(notificationsErrorMessage({ status: 503, message: 'x' })).toBe(
      'El servicio de notificaciones no está disponible',
    );
  });

  it('otros estados usan el mensaje del error', () => {
    expect(notificationsErrorMessage({ status: 404, message: 'Aviso no encontrado' })).toBe(
      'Aviso no encontrado',
    );
  });
});
