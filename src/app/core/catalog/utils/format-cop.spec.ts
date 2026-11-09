import { formatCop } from './format-cop';

describe('formatCop', () => {
  it.each<[number, string]>([
    [0, '$ 0'],
    [1000, '$ 1.000'],
    [25000, '$ 25.000'],
    [1234567, '$ 1.234.567'],
  ])('%i → %s', (value, expected) => {
    expect(formatCop(value)).toBe(expected);
  });

  it('no añade decimales', () => {
    expect(formatCop(25000)).not.toContain(',');
  });
});
