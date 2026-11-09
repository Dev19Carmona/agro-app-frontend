import { parsePage, parsePaymentsFilter, paymentsFilterQuery } from './filter-params';

const ID = '0123456789abcdef01234567';

function params(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe('filter-params de pagos', () => {
  it('sin parámetros da la página 1 sin filtros', () => {
    expect(parsePaymentsFilter(params({}))).toEqual({ page: 1 });
  });

  it('lee status, orderId y page válidos', () => {
    expect(parsePaymentsFilter(params({ status: 'DECLINED', orderId: ID, page: '3' }))).toEqual({
      page: 3,
      status: 'DECLINED',
      orderId: ID,
    });
  });

  it('ignora valores inválidos', () => {
    expect(parsePaymentsFilter(params({ status: 'declined', orderId: 'abc', page: '0' }))).toEqual({
      page: 1,
    });
    expect(parsePaymentsFilter(params({ orderId: `${ID}z`, page: '-2' }))).toEqual({ page: 1 });
  });

  it('parsePage rechaza decimales, texto y valores no seguros', () => {
    expect(parsePage('2.5')).toBe(1);
    expect(parsePage('dos')).toBe(1);
    expect(parsePage('99999999999999999999')).toBe(1);
    expect(parsePage(null)).toBe(1);
    expect(parsePage('7')).toBe(7);
  });

  it('la query omite los valores por defecto', () => {
    expect(paymentsFilterQuery({ page: 1 })).toEqual({});
    expect(paymentsFilterQuery({ page: 2, status: 'APPROVED', orderId: ID })).toEqual({
      status: 'APPROVED',
      orderId: ID,
      page: '2',
    });
  });
});
