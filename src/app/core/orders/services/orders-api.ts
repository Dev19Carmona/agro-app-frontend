import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL, toApiError } from '../../http';
import { Order } from '../models/orders.types';

/** Lectura de un pedido (`GET /orders/:id`), compartida por `features/pedidos` y `features/pagos`. */
@Service()
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/orders`;

  getOrder(id: string): Observable<Order> {
    return this.http
      .get<Order>(`${this.base}/${encodeURIComponent(id)}`)
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
