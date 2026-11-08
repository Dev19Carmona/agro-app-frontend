import {
  changePasswordErrorMessage,
  loginErrorMessage,
  loginNotice,
  registerErrorMessage,
} from './auth-messages';

describe('loginErrorMessage', () => {
  it.each([
    [0, 'x', 'No se pudo conectar con el servidor'],
    [401, 'x', 'Credenciales inválidas'],
    [429, 'x', 'Demasiados intentos, espera un minuto'],
    [403, 'Cuenta deshabilitada', 'Cuenta deshabilitada'],
    [500, 'Error interno', 'Error interno'],
  ])('status %i', (status, message, expected) => {
    expect(loginErrorMessage({ status, message })).toBe(expected);
  });
});

describe('registerErrorMessage', () => {
  it.each([
    [0, 'x', 'No se pudo conectar con el servidor'],
    [409, 'x', 'Ese email ya está registrado'],
    [429, 'x', 'Demasiados intentos, espera un minuto'],
    [400, 'La contraseña es débil', 'La contraseña es débil'],
  ])('status %i', (status, message, expected) => {
    expect(registerErrorMessage({ status, message })).toBe(expected);
  });
});

describe('loginNotice', () => {
  it('reconoce los tres avisos', () => {
    expect(loginNotice('registro')?.variant).toBe('success');
    expect(loginNotice('clave')?.variant).toBe('success');
    expect(loginNotice('sesion')?.variant).toBe('info');
  });

  it.each([null, '', 'otro', 'constructor', 'toString'])('ignora %j', (value) => {
    expect(loginNotice(value)).toBeNull();
  });
});

describe('changePasswordErrorMessage', () => {
  it.each([
    [0, 'x', 'No se pudo conectar con el servidor'],
    [429, 'x', 'Demasiados intentos, espera un minuto'],
    [401, 'Contraseña actual incorrecta', 'Contraseña actual incorrecta'],
    [400, 'La contraseña es débil', 'La contraseña es débil'],
  ])('status %i', (status, message, expected) => {
    expect(changePasswordErrorMessage({ status, message })).toBe(expected);
  });
});
