import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Page, StoreDetail } from '../../../core/catalog';
import { API_BASE_URL, toApiError } from '../../../core/http';
import type { Order } from '../../../core/orders';
import {
  ADMIN_PAGE_SIZE,
  AdminCategory,
  AdminOrderSummary,
  AdminOrdersFilter,
  AdminPayment,
  AdminPaymentDetail,
  AdminPaymentsFilter,
  AdminUser,
  StoresFilter,
  UpdateCategoryRequest,
  UpdateStoreRequest,
  UserRole,
  UsersFilter,
} from '../models/admin.types';

/**
 * Cliente de los endpoints de administración (usuarios, categorías, tiendas, pedidos y pagos).
 * Los errores salen como `ApiError`. La query se valida de forma estricta en el backend, así que
 * solo se envían los parámetros y campos con valor.
 */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly root = inject(API_BASE_URL);

  // --- Usuarios ---

  listUsers(filter: UsersFilter, limit = ADMIN_PAGE_SIZE): Observable<Page<AdminUser>> {
    return this.request(
      this.http.get<Page<AdminUser>>(`${this.root}/auth/users`, {
        params: this.params(filter.page, limit, { rol: filter.rol, status: filter.status }),
      }),
    );
  }

  getUser(id: string): Observable<AdminUser> {
    return this.request(this.http.get<AdminUser>(this.user(id)));
  }

  approveUser(id: string): Observable<AdminUser> {
    return this.request(this.http.post<AdminUser>(`${this.user(id)}/approve`, {}));
  }

  /** `reason` vacío o en blanco se omite del cuerpo. */
  rejectUser(id: string, reason?: string): Observable<AdminUser> {
    const trimmed = reason?.trim();
    return this.request(
      this.http.post<AdminUser>(`${this.user(id)}/reject`, trimmed ? { reason: trimmed } : {}),
    );
  }

  disableUser(id: string): Observable<AdminUser> {
    return this.request(this.http.post<AdminUser>(`${this.user(id)}/disable`, {}));
  }

  enableUser(id: string): Observable<AdminUser> {
    return this.request(this.http.post<AdminUser>(`${this.user(id)}/enable`, {}));
  }

  changeUserRole(id: string, rol: UserRole): Observable<AdminUser> {
    return this.request(this.http.patch<AdminUser>(`${this.user(id)}/role`, { rol }));
  }

  // --- Categorías ---

  /** Todas las categorías, también las desactivadas. */
  listCategories(): Observable<AdminCategory[]> {
    return this.request(this.http.get<AdminCategory[]>(`${this.root}/catalog/admin/categories`));
  }

  createCategory(nombre: string): Observable<AdminCategory> {
    return this.request(
      this.http.post<AdminCategory>(`${this.root}/catalog/categories`, { nombre }),
    );
  }

  updateCategory(id: string, body: UpdateCategoryRequest): Observable<AdminCategory> {
    return this.request(
      this.http.patch<AdminCategory>(
        `${this.root}/catalog/categories/${encodeURIComponent(id)}`,
        body,
      ),
    );
  }

  // --- Tiendas ---

  listStores(filter: StoresFilter, limit = ADMIN_PAGE_SIZE): Observable<Page<StoreDetail>> {
    return this.request(
      this.http.get<Page<StoreDetail>>(`${this.root}/catalog/admin/stores`, {
        params: this.params(filter.page, limit, { municipio: filter.municipio }),
      }),
    );
  }

  getStore(id: string): Observable<StoreDetail> {
    return this.request(this.http.get<StoreDetail>(this.store(id)));
  }

  updateStore(id: string, body: UpdateStoreRequest): Observable<StoreDetail> {
    return this.request(this.http.patch<StoreDetail>(this.store(id), body));
  }

  /** Idempotente y definitivo: una tienda desactivada no se reactiva. */
  deactivateStore(id: string): Observable<StoreDetail> {
    return this.request(this.http.post<StoreDetail>(`${this.store(id)}/deactivate`, {}));
  }

  // --- Pedidos (solo lectura) ---

  listOrders(
    filter: AdminOrdersFilter,
    limit = ADMIN_PAGE_SIZE,
  ): Observable<Page<AdminOrderSummary>> {
    return this.request(
      this.http.get<Page<AdminOrderSummary>>(`${this.root}/orders/admin`, {
        params: this.params(filter.page, limit, {
          status: filter.status,
          buyerId: filter.buyerId,
        }),
      }),
    );
  }

  getOrder(id: string): Observable<Order> {
    return this.request(
      this.http.get<Order>(`${this.root}/orders/admin/${encodeURIComponent(id)}`),
    );
  }

  // --- Pagos (solo lectura; el backend limita a 10 peticiones por minuto) ---

  listPayments(
    filter: AdminPaymentsFilter,
    limit = ADMIN_PAGE_SIZE,
  ): Observable<Page<AdminPayment>> {
    return this.request(
      this.http.get<Page<AdminPayment>>(`${this.root}/payments/admin`, {
        params: this.params(filter.page, limit, {
          status: filter.status,
          buyerId: filter.buyerId,
          orderId: filter.orderId,
        }),
      }),
    );
  }

  getPayment(id: string): Observable<AdminPaymentDetail> {
    return this.request(
      this.http.get<AdminPaymentDetail>(`${this.root}/payments/admin/${encodeURIComponent(id)}`),
    );
  }

  private user(id: string): string {
    return `${this.root}/auth/users/${encodeURIComponent(id)}`;
  }

  private store(id: string): string {
    return `${this.root}/catalog/admin/stores/${encodeURIComponent(id)}`;
  }

  private params(
    page: number,
    limit: number,
    optional: Record<string, string | undefined>,
  ): HttpParams {
    let params = new HttpParams().set('page', page).set('limit', limit);
    for (const [key, value] of Object.entries(optional)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return params;
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
