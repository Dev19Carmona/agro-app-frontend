import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Page } from '../../../core/catalog';
import { API_BASE_URL, toApiError } from '../../../core/http';
import { Order, OrderSummary } from '../../../core/orders';
import { OrdersFilter, PEDIDOS_PAGE_SIZE } from '../models/pedidos.types';
import { toCheckoutError } from '../utils/checkout-error';

/**
 * Cliente de `POST /orders/checkout` y `GET /orders`; `GET /orders/:id` es `OrdersApi` (`core/orders`). Los errores salen como
 * `ApiError`; los del checkout como `CheckoutApiError` (con las líneas inválidas, si las hay).
 *
 * El backend valida la query con un esquema estricto: solo se envían los parámetros con valor.
 */
@Service()
export class PedidosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/orders`;

  /** Crea el pedido `PENDING` desde el carrito. Repetir la misma `key` devuelve el mismo pedido. */
  checkout(key: string): Observable<Order> {
    return this.http
      .post<Order>(`${this.base}/checkout`, null, {
        headers: new HttpHeaders({ 'Idempotency-Key': key }),
      })
      .pipe(catchError((error: unknown) => throwError(() => toCheckoutError(error))));
  }

  listOrders(filter: OrdersFilter): Observable<Page<OrderSummary>> {
    let params = new HttpParams().set('page', filter.page).set('limit', PEDIDOS_PAGE_SIZE);
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    return this.request(this.http.get<Page<OrderSummary>>(this.base, { params }));
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
