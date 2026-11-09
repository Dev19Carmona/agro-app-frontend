import { ProductsFilter, StoresFilter } from '../models/catalogo.types';

/** Lo que usamos de `ParamMap`: se puede pasar uno del router o uno de prueba. */
export interface ParamReader {
  get(name: string): string | null;
}

export const MUNICIPIO_MAX_LENGTH = 100;

const OBJECT_ID = /^[a-f\d]{24}$/i;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** Un id de Mongo: 24 caracteres hexadecimales. El backend rechaza cualquier otro con `400`. */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

function parseId(value: string | null): string | undefined {
  return isObjectId(value) ? value : undefined;
}

/** Recorta espacios y limita a 100 caracteres. Vacío = sin valor. */
function parseMunicipio(value: string | null): string | undefined {
  const trimmed = (value ?? '').trim().slice(0, MUNICIPIO_MAX_LENGTH).trim();
  return trimmed || undefined;
}

/** Entero mayor o igual a 1. Cualquier otra cosa (`0`, `-1`, `abc`, `1.5`) vale 1. */
function parsePage(value: string | null): number {
  if (value === null || !POSITIVE_INTEGER.test(value)) {
    return 1;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

/**
 * Lee los filtros del listado de productos desde la URL. Los valores inválidos se ignoran. No lee
 * `storeId`: ese filtro lo pone el detalle de tienda desde su ruta, no la URL del listado.
 */
export function parseProductsFilter(params: ParamReader): ProductsFilter {
  const categoryId = parseId(params.get('categoryId'));
  const municipio = parseMunicipio(params.get('municipio'));
  return {
    ...(categoryId && { categoryId }),
    ...(municipio && { municipio }),
    page: parsePage(params.get('page')),
  };
}

/** Lee los filtros del directorio de tiendas desde la URL. */
export function parseStoresFilter(params: ParamReader): StoresFilter {
  const municipio = parseMunicipio(params.get('municipio'));
  return { ...(municipio && { municipio }), page: parsePage(params.get('page')) };
}

/** Lee solo la página (detalle de tienda y ofertas). */
export function parsePageParam(params: ParamReader): number {
  return parsePage(params.get('page'));
}

/**
 * Filtros → query params de la URL. Omite lo que no tiene valor y `page` cuando es 1, para
 * que la URL sin filtros quede limpia.
 */
export function toQueryParams(filter: {
  categoryId?: string;
  municipio?: string;
  page: number;
}): Record<string, string> {
  const query: Record<string, string> = {};
  if (filter.categoryId) {
    query['categoryId'] = filter.categoryId;
  }
  if (filter.municipio) {
    query['municipio'] = filter.municipio;
  }
  if (filter.page > 1) {
    query['page'] = String(filter.page);
  }
  return query;
}
