/** Filtros de `GET /catalog/products`. `page` empieza en 1. */
export interface ProductsFilter {
  categoryId?: string;
  storeId?: string;
  municipio?: string;
  page: number;
}

/** Filtros de `GET /catalog/stores`. */
export interface StoresFilter {
  municipio?: string;
  page: number;
}

/** Se envía como `limit`. Encaja en rejillas de 1, 2, 3 y 4 columnas; el backend admite 1 a 100. */
export const CATALOGO_PAGE_SIZE = 12;

/** Tiendas que se piden de una vez para rotular las tarjetas de producto (máximo del backend). */
export const STORE_LOOKUP_LIMIT = 100;
