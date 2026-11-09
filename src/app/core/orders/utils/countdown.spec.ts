import { formatCountdown, remainingMs } from './countdown';

const END = '2026-11-09T10:15:00.000Z';
const END_MS = Date.parse(END);

describe('remainingMs', () => {
  it('devuelve lo que falta hasta expiresAt', () => {
    expect(remainingMs(END, END_MS - 90_000)).toBe(90_000);
  });

  it('en el límite exacto es 0', () => {
    expect(remainingMs(END, END_MS)).toBe(0);
  });

  it('nunca es negativo', () => {
    expect(remainingMs(END, END_MS + 5_000)).toBe(0);
  });

  it('una fecha inválida cuenta como vencida', () => {
    expect(remainingMs('no es una fecha', END_MS)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '00:00'],
    [-500, '00:00'],
    [1, '00:01'],
    [999, '00:01'],
    [1_000, '00:01'],
    [59_000, '00:59'],
    [60_000, '01:00'],
    [61_000, '01:01'],
    [15 * 60_000, '15:00'],
    [14 * 60_000 + 59_500, '15:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
