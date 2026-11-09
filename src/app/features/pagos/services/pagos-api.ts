import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Page } from '../../../core/catalog';
import { API_BASE_URL, toApiError } from '../../../core/http';
import { CreatePaymentRequest, PAGOS_PAGE_SIZE, PaymentsFilter } from '../models/pagos.types';
import { Payment } from '../../../core/payments';

/**
 * Cliente de `POST /payments`, `GET /payments` y `GET /payments/:id`. Los errores salen como
 * `ApiError` (con `code` en los `409`). El cuerpo nunca lleva monto: lo toma el backend del pedido.
 * La query se valida de forma estricta en el backend, así que solo se envían los parámetros con valor.
 */
@Service()
export class PagosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/payments`;

  /** `201` en el primer intento y `200` al repetir la misma `key` con el mismo cuerpo. */
  createPayment(body: CreatePaymentRequest, key: string): Observable<Payment> {
    return this.request(
      this.http.post<Payment>(this.base, body, {
        headers: new HttpHeaders({ 'Idempotency-Key': key }),
      }),
    );
  }

  listPayments(filter: PaymentsFilter, limit = PAGOS_PAGE_SIZE): Observable<Page<Payment>> {
    let params = new HttpParams().set('page', filter.page).set('limit', limit);
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.orderId) {
      params = params.set('orderId', filter.orderId);
    }
    return this.request(this.http.get<Page<Payment>>(this.base, { params }));
  }

  getPayment(id: string): Observable<Payment> {
    return this.request(this.http.get<Payment>(`${this.base}/${encodeURIComponent(id)}`));
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
