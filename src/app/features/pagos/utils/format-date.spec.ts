import { formatDateTime } from './format-date';

describe('formatDateTime', () => {
  it('da texto vacío si no es una fecha', () => {
    expect(formatDateTime('no es fecha')).toBe('');
  });

  it('formatea una fecha ISO en español', () => {
    expect(formatDateTime('2026-11-09T15:30:00.000Z')).toMatch(/2026/);
  });
});
