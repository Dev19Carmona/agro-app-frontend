import {
  filterQuery,
  isObjectId,
  parseMunicipio,
  parseOrdersFilter,
  parsePage,
  parsePaymentsFilter,
  parseStoresFilter,
  parseUsersFilter,
} from './filter-params';

const ID = '0123456789abcdef01234567';

function params(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe('filter-params de administración', () => {
  it('parsePage acepta enteros ≥ 1 y el resto da 1', () => {
    expect(parsePage('4')).toBe(4);
    for (const bad of [null, '', '0', '-1', '1.5', 'abc', '99999999999999999999']) {
      expect(parsePage(bad)).toBe(1);
    }
  });

  it('isObjectId exige 24 hexadecimales', () => {
    expect(isObjectId(ID)).toBe(true);
    expect(isObjectId(ID.toUpperCase())).toBe(true);
    expect(isObjectId('abc')).toBe(false);
    expect(isObjectId(ID + 'a')).toBe(false);
    expect(isObjectId('z'.repeat(24))).toBe(false);
  });

  it('parseMunicipio recorta, limita a 100 y descarta el vacío', () => {
    expect(parseMunicipio('  Pasto ')).toBe('Pasto');
    expect(parseMunicipio('a'.repeat(150))).toBe('a'.repeat(100));
    expect(parseMunicipio('   ')).toBeUndefined();
    expect(parseMunicipio(null)).toBeUndefined();
  });

  describe('usuarios', () => {
    it('lee rol, status y page válidos', () => {
      expect(
        parseUsersFilter(params({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL', page: '2' })),
      ).toEqual({ page: 2, rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' });
    });

    it('ignora valores inválidos', () => {
      expect(parseUsersFilter(params({ rol: 'VISITANTE', status: 'x', page: '0' }))).toEqual({
        page: 1,
      });
    });
  });

  describe('tiendas', () => {
    it('lee municipio recortado y page', () => {
      expect(parseStoresFilter(params({ municipio: ' Pasto ', page: '2' }))).toEqual({
        page: 2,
        municipio: 'Pasto',
      });
    });

    it('ignora un municipio vacío', () => {
      expect(parseStoresFilter(params({ municipio: '  ' }))).toEqual({ page: 1 });
    });
  });

  describe('pedidos', () => {
    it('lee status, buyerId y page válidos', () => {
      expect(parseOrdersFilter(params({ status: 'CONFIRMED', buyerId: ID, page: '3' }))).toEqual({
        page: 3,
        status: 'CONFIRMED',
        buyerId: ID,
      });
    });

    it('ignora status y buyerId inválidos', () => {
      expect(parseOrdersFilter(params({ status: 'PAID', buyerId: 'abc' }))).toEqual({ page: 1 });
    });
  });

  describe('pagos', () => {
    it('lee status, buyerId, orderId y page válidos', () => {
      expect(
        parsePaymentsFilter(params({ status: 'DECLINED', buyerId: ID, orderId: ID, page: '5' })),
      ).toEqual({ page: 5, status: 'DECLINED', buyerId: ID, orderId: ID });
    });

    it('ignora valores inválidos de cada filtro', () => {
      expect(
        parsePaymentsFilter(params({ status: 'declined', buyerId: 'x', orderId: 'y', page: '-2' })),
      ).toEqual({ page: 1 });
    });
  });

  describe('filterQuery', () => {
    it('no escribe valores por defecto', () => {
      expect(filterQuery({ page: 1 })).toEqual({});
    });

    it('escribe filtros y página mayor a 1', () => {
      expect(filterQuery({ page: 3, rol: 'ADMIN', status: 'ACTIVE' })).toEqual({
        page: '3',
        rol: 'ADMIN',
        status: 'ACTIVE',
      });
      expect(filterQuery({ page: 1, buyerId: ID, orderId: ID, status: 'APPROVED' })).toEqual({
        buyerId: ID,
        orderId: ID,
        status: 'APPROVED',
      });
    });
  });
});
