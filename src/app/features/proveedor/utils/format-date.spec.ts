import { formatDate, formatDateTime } from './format-date';

describe('format-date', () => {
  it('formatDate da una fecha en español sin hora', () => {
    const text = formatDate('2026-11-08T15:30:00.000Z');
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/8/);
    expect(text).not.toMatch(/:/);
  });

  it('formatDateTime incluye la hora', () => {
    expect(formatDateTime('2026-11-08T15:30:00.000Z')).toMatch(/:/);
  });

  it('una fecha inválida da texto vacío', () => {
    expect(formatDate('no-es-fecha')).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});
