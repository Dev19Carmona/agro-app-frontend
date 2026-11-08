import { isValidDocument, isValidName, passwordProblems } from './register-validation';

describe('passwordProblems', () => {
  it('una contraseña que cumple la política no tiene problemas', () => {
    expect(passwordProblems('ClaveSegura123', 'ana@agro.test')).toEqual([]);
  });

  it('exige 10 caracteres', () => {
    expect(passwordProblems('Corta1a', '')).toEqual([
      'La contraseña debe tener al menos 10 caracteres',
    ]);
    expect(passwordProblems('Exacta10aA', '')).toEqual([]);
  });

  it('limita a 72 bytes, no a 72 caracteres', () => {
    const ok = 'Aa1' + 'x'.repeat(69); // 72 bytes
    expect(passwordProblems(ok, '')).toEqual([]);
    expect(passwordProblems(ok + 'x', '')).toEqual(['La contraseña no puede superar 72 bytes']);
    // 'ñ' ocupa 2 bytes: con 3 de prefijo caben 34 (71 bytes); 35 se pasan (73) con pocos caracteres.
    expect(passwordProblems('Aa1' + 'ñ'.repeat(34), '')).toEqual([]);
    expect(passwordProblems('Aa1' + 'ñ'.repeat(35), '')).toEqual([
      'La contraseña no puede superar 72 bytes',
    ]);
  });

  it.each([
    ['clavesegura123', 'La contraseña debe incluir una mayúscula'],
    ['CLAVESEGURA123', 'La contraseña debe incluir una minúscula'],
    ['ClaveSegura', 'La contraseña debe incluir un número'],
  ])('%s: %s', (password, message) => {
    expect(passwordProblems(password, '')).toEqual([message]);
  });

  it('reconoce mayúsculas y minúsculas Unicode', () => {
    expect(passwordProblems('Ñandúsegura1', '')).toEqual([]);
  });

  it('no puede contener el email, sin importar mayúsculas ni espacios', () => {
    expect(passwordProblems('Xana@agro.testY1', ' ANA@agro.test ')).toEqual([
      'La contraseña no puede contener el email',
    ]);
  });

  it('con varios incumplimientos los devuelve todos, en orden', () => {
    expect(passwordProblems('abc', '')).toEqual([
      'La contraseña debe tener al menos 10 caracteres',
      'La contraseña debe incluir una mayúscula',
      'La contraseña debe incluir un número',
    ]);
  });
});

describe('isValidName', () => {
  it.each([
    ['Al', true],
    ['  Ana Pérez  ', true],
    ['A', false],
    ['  A  ', false],
    ['', false],
    ['x'.repeat(120), true],
    ['x'.repeat(121), false],
  ])('%j → %s', (name, expected) => {
    expect(isValidName(name)).toBe(expected);
  });
});

describe('isValidDocument', () => {
  it.each([
    ['12345', true],
    ['ABC-12345', true],
    [' 12345 ', true],
    ['1234', false],
    ['x'.repeat(20), true],
    ['x'.repeat(21), false],
    ['123 456', false],
    ['123_456', false],
    ['12.345', false],
  ])('%j → %s', (documento, expected) => {
    expect(isValidDocument(documento)).toBe(expected);
  });
});
