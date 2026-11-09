import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
  EMPTY,
  Observable,
  catchError,
  expand,
  filter,
  map,
  take,
  throwError,
  throwIfEmpty,
} from 'rxjs';
import { Page } from '../../../core/catalog';
import { API_BASE_URL, ApiError, toApiError } from '../../../core/http';
import {
  CreateProductRequest,
  CreateStoreRequest,
  CreateVariantRequest,
  MyProduct,
  MyStore,
  MyVariant,
  PROVEEDOR_PAGE_SIZE,
  ProductView,
  ProviderSubOrder,
  UpdateProductRequest,
  UpdateVariantRequest,
} from '../models/proveedor.types';
import { isObjectId } from '../utils/product-validation';

const PRODUCT_NOT_FOUND: ApiError = { status: 404, message: 'Producto no encontrado' };
/** Máximo que admite el backend por página; se usa para buscar un producto por id. */
const LOOKUP_LIMIT = 100;

/**
 * Cliente de los endpoints del proveedor: `/catalog/*` (tienda, productos, presentaciones y stock)
 * y `/orders/provider/*`. Todos los errores salen como `ApiError`. `storeId` nunca viaja en el
 * cuerpo: el backend lo saca del token.
 */
@Service()
export class ProveedorApi {
  private readonly http = inject(HttpClient);
  private readonly catalog = `${inject(API_BASE_URL)}/catalog`;
  private readonly orders = `${inject(API_BASE_URL)}/orders/provider/sub-orders`;

  /** `404` si el proveedor aún no tiene tienda. */
  getMyStore(): Observable<MyStore> {
    return this.request(this.http.get<MyStore>(`${this.catalog}/my-store`));
  }

  createStore(body: CreateStoreRequest): Observable<MyStore> {
    return this.request(this.http.post<MyStore>(`${this.catalog}/stores`, body));
  }

  /** Productos propios, activos e inactivos, con todas sus presentaciones. */
  listMyProducts(page: number, limit = PROVEEDOR_PAGE_SIZE): Observable<Page<MyProduct>> {
    return this.request(
      this.http.get<Page<MyProduct>>(`${this.catalog}/my-store/products`, {
        params: this.pageParams(page, limit),
      }),
    );
  }

  /**
   * No hay `GET /catalog/my-store/products/:id`: se recorre el listado (100 por página) hasta
   * encontrar el producto. `404` si no está o si el id no tiene formato válido.
   */
  getMyProduct(id: string): Observable<MyProduct> {
    if (!isObjectId(id)) {
      return throwError(() => PRODUCT_NOT_FOUND);
    }
    return this.listMyProducts(1, LOOKUP_LIMIT).pipe(
      expand((result) =>
        result.page < result.totalPages && !result.data.some((p) => p.id === id)
          ? this.listMyProducts(result.page + 1, LOOKUP_LIMIT)
          : EMPTY,
      ),
      map((result) => result.data.find((p) => p.id === id)),
      filter((product): product is MyProduct => product !== undefined),
      take(1),
      throwIfEmpty(() => PRODUCT_NOT_FOUND),
    );
  }

  /** Crea el producto (sin presentaciones). */
  createProduct(body: CreateProductRequest): Observable<ProductView> {
    return this.request(this.http.post<ProductView>(`${this.catalog}/products`, body));
  }

  updateProduct(id: string, body: UpdateProductRequest): Observable<ProductView> {
    return this.request(
      this.http.patch<ProductView>(`${this.catalog}/products/${encodeURIComponent(id)}`, body),
    );
  }

  createVariant(productId: string, body: CreateVariantRequest): Observable<MyVariant> {
    return this.request(
      this.http.post<MyVariant>(
        `${this.catalog}/products/${encodeURIComponent(productId)}/variants`,
        body,
      ),
    );
  }

  updateVariant(id: string, body: UpdateVariantRequest): Observable<MyVariant> {
    return this.request(
      this.http.patch<MyVariant>(`${this.catalog}/variants/${encodeURIComponent(id)}`, body),
    );
  }

  /** Fija el stock (valor absoluto). `409` si queda por debajo de lo reservado. */
  setStock(id: string, stock: number): Observable<MyVariant> {
    return this.request(
      this.http.patch<MyVariant>(`${this.catalog}/variants/${encodeURIComponent(id)}/stock`, {
        stock,
      }),
    );
  }

  listSubOrders(page: number, limit = PROVEEDOR_PAGE_SIZE): Observable<Page<ProviderSubOrder>> {
    return this.request(
      this.http.get<Page<ProviderSubOrder>>(this.orders, { params: this.pageParams(page, limit) }),
    );
  }

  getSubOrder(id: string): Observable<ProviderSubOrder> {
    return this.request(this.http.get<ProviderSubOrder>(`${this.orders}/${encodeURIComponent(id)}`));
  }

  private pageParams(page: number, limit: number): HttpParams {
    return new HttpParams().set('page', page).set('limit', limit);
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
