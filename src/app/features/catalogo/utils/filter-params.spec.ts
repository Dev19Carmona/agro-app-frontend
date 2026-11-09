import { convertToParamMap } from '@angular/router';
import {
  isObjectId,
  parsePageParam,
  parseProductsFilter,
  parseStoresFilter,
  toQueryParams,
} from './filter-params';

const ID = '507f1f77bcf86cd799439011';
const read = (params: Record<string, string>) => convertToParamMap(params);

describe('isObjectId', () => {
  it('acepta 24 caracteres hexadecimales', () => {
    expect(isObjectId(ID)).toBe(true);
    expect(isObjectId(ID.toUpperCase())).toBe(true);
  });

  it.each(['', 'xyz', ID.slice(1), `${ID}0`, `${ID.slice(1)}g`, ' ' + ID])(
    'rechaza %j',
    (value) => {
      expect(isObjectId(value)).toBe(false);
    },
  );

  it('rechaza lo que no es texto', () => {
    expect(isObjectId(null)).toBe(false);
    expect(isObjectId(undefined)).toBe(false);
    expect(isObjectId(123)).toBe(false);
  });
});

describe('parseProductsFilter', () => {
  it('sin params: página 1 y nada más', () => {
    expect(parseProductsFilter(read({}))).toEqual({ page: 1 });
  });

  it('lee categoría, municipio y página válidos', () => {
    expect(parseProductsFilter(read({ categoryId: ID, municipio: 'Medellín', page: '3' }))).toEqual(
      { categoryId: ID, municipio: 'Medellín', page: 3 },
    );
  });

  it('ignora una categoría inválida', () => {
    expect(parseProductsFilter(read({ categoryId: 'xyz' }))).toEqual({ page: 1 });
  });

  it('no lee storeId de la URL', () => {
    expect(parseProductsFilter(read({ storeId: ID }))).toEqual({ page: 1 });
  });

  it.each(['0', '-1', 'abc', '1.5', '', '01', '1e3', '9999999999999999999999'])(
    'page %j vale 1',
    (page) => {
      expect(parseProductsFilter(read({ page })).page).toBe(1);
    },
  );

  it('un municipio vacío o solo espacios se ignora', () => {
    expect(parseProductsFilter(read({ municipio: '' }))).toEqual({ page: 1 });
    expect(parseProductsFilter(read({ municipio: '   ' }))).toEqual({ page: 1 });
  });

  it('recorta el municipio', () => {
    expect(parseProductsFilter(read({ municipio: '  Rionegro  ' })).municipio).toBe('Rionegro');
  });

  it('limita el municipio a 100 caracteres', () => {
    const municipio = parseProductsFilter(read({ municipio: 'a'.repeat(200) })).municipio;
    expect(municipio).toHaveLength(100);
  });
});

describe('parseStoresFilter y parsePageParam', () => {
  it('lee municipio y página', () => {
    expect(parseStoresFilter(read({ municipio: 'Bello', page: '2' }))).toEqual({
      municipio: 'Bello',
      page: 2,
    });
  });

  it('valores inválidos → sin municipio y página 1', () => {
    expect(parseStoresFilter(read({ municipio: '', page: 'abc' }))).toEqual({ page: 1 });
  });

  it('parsePageParam usa las mismas reglas', () => {
    expect(parsePageParam(read({ page: '4' }))).toBe(4);
    expect(parsePageParam(read({ page: '0' }))).toBe(1);
    expect(parsePageParam(read({}))).toBe(1);
  });
});

describe('toQueryParams', () => {
  it('omite lo vacío y la página 1', () => {
    expect(toQueryParams({ page: 1 })).toEqual({});
    expect(toQueryParams({ municipio: '', page: 1 })).toEqual({});
  });

  it('incluye filtros y página mayor que 1', () => {
    expect(toQueryParams({ categoryId: ID, municipio: 'Bello', page: 2 })).toEqual({
      categoryId: ID,
      municipio: 'Bello',
      page: '2',
    });
  });

  it('es la inversa de parseProductsFilter', () => {
    const filter = { categoryId: ID, municipio: 'Bello', page: 5 };
    expect(parseProductsFilter(read(toQueryParams(filter)))).toEqual(filter);
  });
});
