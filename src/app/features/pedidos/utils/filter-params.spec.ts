import { convertToParamMap } from '@angular/router';
import { ordersFilterQuery, parseOrdersFilter, parsePage } from './filter-params';

const parse = (params: Record<string, string>) => parseOrdersFilter(convertToParamMap(params));

describe('parsePage', () => {
  it.each([
    ['1', 1],
    ['7', 7],
    [null, 1],
    ['', 1],
    ['0', 1],
    ['-2', 1],
    ['2.5', 1],
    ['abc', 1],
    ['99999999999999999999', 1],
  ])('%s → %s', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});

describe('parseOrdersFilter', () => {
  it('sin parámetros: página 1 y todos los estados', () => {
    expect(parse({})).toEqual({ page: 1 });
  });

  it('acepta un status válido y una página', () => {
    expect(parse({ status: 'AWAITING_PAYMENT', page: '3' })).toEqual({
      page: 3,
      status: 'AWAITING_PAYMENT',
    });
  });

  it('ignora valores inválidos', () => {
    expect(parse({ status: 'OTRO', page: 'x' })).toEqual({ page: 1 });
    expect(parse({ status: 'pending', page: '0' })).toEqual({ page: 1 });
  });
});

describe('ordersFilterQuery', () => {
  it('no escribe los valores por defecto', () => {
    expect(ordersFilterQuery({ page: 1 })).toEqual({});
  });

  it('escribe status y página cuando cambian', () => {
    expect(ordersFilterQuery({ page: 2, status: 'CANCELLED' })).toEqual({
      status: 'CANCELLED',
      page: '2',
    });
    expect(ordersFilterQuery({ page: 1, status: 'CONFIRMED' })).toEqual({ status: 'CONFIRMED' });
  });
});
