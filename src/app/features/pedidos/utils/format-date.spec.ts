import { formatDateTime } from './format-date';

describe('formatDateTime', () => {
  it('da fecha y hora en español', () => {
    const text = formatDateTime('2026-11-08T15:30:00.000Z');
    expect(text).toMatch(/2026/);
  });

  it('con un valor que no es una fecha da texto vacío', () => {
    expect(formatDateTime('no es una fecha')).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});
