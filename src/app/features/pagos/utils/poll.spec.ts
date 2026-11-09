import { nextPollInterval, withinPollWindow } from './poll';

describe('poll', () => {
  it('duplica el intervalo ante un 429 hasta 30 segundos', () => {
    expect(nextPollInterval(8000, true)).toBe(16000);
    expect(nextPollInterval(16000, true)).toBe(30000);
    expect(nextPollInterval(30000, true)).toBe(30000);
  });

  it('vuelve al intervalo base sin 429', () => {
    expect(nextPollInterval(30000, false)).toBe(8000);
  });

  it('el sondeo se agota al llegar al máximo', () => {
    expect(withinPollWindow(119_999, 120_000)).toBe(true);
    expect(withinPollWindow(120_000, 120_000)).toBe(false);
  });
});
