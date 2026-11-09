import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE_URL, toApiError } from '../../http';
import { Cart } from '../models/cart.types';

/** Cliente de `/orders/cart`. Todos los errores salen como `ApiError`. */
@Service()
export class CartApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/orders/cart`;

  get(): Observable<Cart> {
    return this.request(this.http.get<Cart>(this.base));
  }

  /** Fija la cantidad (valor absoluto, entero de 1 a 1000). */
  setItem(variantId: string, cantidad: number): Observable<void> {
    return this.request(
      this.http
        .put(`${this.base}/items/${encodeURIComponent(variantId)}`, { cantidad })
        .pipe(map(() => undefined)),
    );
  }

  removeItem(variantId: string): Observable<void> {
    return this.request(
      this.http.delete<void>(`${this.base}/items/${encodeURIComponent(variantId)}`),
    );
  }

  clear(): Observable<void> {
    return this.request(this.http.delete<void>(this.base));
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
