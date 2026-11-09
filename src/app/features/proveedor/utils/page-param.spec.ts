import { pageQuery, parsePage } from './page-param';

describe('page-param', () => {
  it.each([
    [null, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['3', 3],
    ['99999999999999999999', 1],
  ])('parsePage(%j) = %i', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });

  it('pageQuery omite la página 1', () => {
    expect(pageQuery(1)).toEqual({});
    expect(pageQuery(4)).toEqual({ page: '4' });
  });
});
