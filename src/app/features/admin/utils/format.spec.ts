import { formatDateTime, shortId } from './format';

describe('format', () => {
  it('formatDateTime da texto vacío si no hay fecha válida', () => {
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('no es fecha')).toBe('');
  });

  it('formatDateTime formatea una fecha ISO', () => {
    expect(formatDateTime('2026-11-09T15:30:00.000Z')).toMatch(/2026/);
  });

  it('shortId abrevia ids largos y deja los cortos', () => {
    expect(shortId('0123456789abcdef01234567')).toBe('01234567…');
    expect(shortId('abc')).toBe('abc');
  });
});
