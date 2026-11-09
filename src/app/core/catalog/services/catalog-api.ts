import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL, toApiError } from '../../http';
import {
  CATALOGO_PAGE_SIZE,
  ProductsFilter,
  STORE_LOOKUP_LIMIT,
  StoresFilter,
} from '../models/catalog-filters.types';
import {
  Page,
  Product,
  ProductDetail,
  PublicCategory,
  PublicStore,
  PublicVariant,
} from '../models/catalog.types';

/**
 * Cliente de los endpoints públicos `GET /catalog/*`. Todos los errores salen como `ApiError`.
 *
 * El backend valida la query con un esquema estricto: solo se envían los parámetros que tienen
 * valor (nunca vacíos ni desconocidos), o respondería `400`.
 */
@Service()
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/catalog`;

  listProducts(filter: ProductsFilter): Observable<Page<Product>> {
    return this.request(
      this.http.get<Page<Product>>(`${this.base}/products`, {
        params: this.params({ ...filter }),
      }),
    );
  }

  getProduct(id: string): Observable<ProductDetail> {
    return this.request(
      this.http.get<ProductDetail>(`${this.base}/products/${encodeURIComponent(id)}`),
    );
  }

  /** Presentaciones con precio de oferta. No trae el nombre del producto, solo `productId`. */
  listOffers(page: number): Observable<Page<PublicVariant>> {
    return this.request(
      this.http.get<Page<PublicVariant>>(`${this.base}/offers`, {
        params: this.params({ page }),
      }),
    );
  }

  listStores(filter: StoresFilter): Observable<Page<PublicStore>> {
    return this.request(
      this.http.get<Page<PublicStore>>(`${this.base}/stores`, {
        params: this.params({ ...filter }),
      }),
    );
  }

  /**
   * Hasta `STORE_LOOKUP_LIMIT` tiendas en una sola petición, para poner el nombre de la tienda en
   * las tarjetas de producto (el listado de productos solo trae `storeId`).
   */
  listStoreNames(): Observable<Page<PublicStore>> {
    return this.request(
      this.http.get<Page<PublicStore>>(`${this.base}/stores`, {
        params: this.params({ page: 1 }, STORE_LOOKUP_LIMIT),
      }),
    );
  }

  getStore(id: string): Observable<PublicStore> {
    return this.request(
      this.http.get<PublicStore>(`${this.base}/stores/${encodeURIComponent(id)}`),
    );
  }

  listCategories(): Observable<PublicCategory[]> {
    return this.request(this.http.get<PublicCategory[]>(`${this.base}/categories`));
  }

  /** Query con `limit` (12 por defecto) y sin los valores vacíos. */
  private params(
    values: Record<string, string | number | undefined>,
    limit = CATALOGO_PAGE_SIZE,
  ): HttpParams {
    let params = new HttpParams().set('limit', limit);
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }
    return params;
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
