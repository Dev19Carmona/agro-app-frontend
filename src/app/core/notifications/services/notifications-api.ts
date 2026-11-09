import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL, ApiError, toApiError } from '../../http';
import {
  AppNotification,
  NOTIFICATIONS_UNAVAILABLE_MESSAGE,
  NotificationsPage,
  NotificationsQuery,
  ProviderSubOrderRefsPage,
} from '../models/notifications.types';

/**
 * Cliente de `/notifications`. Todos los errores salen como `ApiError`. El actor sale del token:
 * nunca se envía `userId` ni `storeId`, y de la consulta solo viajan `limit` y `cursor` con valor.
 */
@Service()
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/notifications`;
  private readonly ordersBase = `${inject(API_BASE_URL)}/orders`;

  list(query: NotificationsQuery = {}): Observable<NotificationsPage> {
    let params = new HttpParams();
    if (query.limit != null) {
      params = params.set('limit', query.limit);
    }
    if (query.cursor) {
      params = params.set('cursor', query.cursor);
    }
    return this.request(this.http.get<NotificationsPage>(this.base, { params }));
  }

  unreadCount(): Observable<{ count: number }> {
    return this.request(this.http.get<{ count: number }>(`${this.base}/unread-count`));
  }

  /** Idempotente: marcar un aviso ya leído no mueve `readAt`. */
  markRead(id: string): Observable<AppNotification> {
    return this.request(
      this.http.patch<AppNotification>(`${this.base}/${encodeURIComponent(id)}/read`, {}),
    );
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.request(this.http.post<{ updated: number }>(`${this.base}/read-all`, {}));
  }

  /**
   * Una página de los sub-pedidos de la tienda del proveedor (más nuevos primero). Solo se usa
   * para saber qué sub-pedido corresponde al `orderId` de un aviso: el detalle del proveedor
   * (`/proveedor/pedidos/:id`) trabaja con el id del sub-pedido.
   */
  listProviderSubOrders(page: number, limit: number): Observable<ProviderSubOrderRefsPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.request(
      this.http.get<ProviderSubOrderRefsPage>(`${this.ordersBase}/provider/sub-orders`, { params }),
    );
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => this.toError(error))));
  }

  /**
   * `toApiError` trata el `503` como «sin conexión» (así responde un proxy sin backend). Aquí un
   * `503` real significa que el servicio `notifications` no está disponible y `api` sí: se
   * conserva el estado para poder explicarlo.
   */
  private toError(error: unknown): ApiError {
    if (error instanceof HttpErrorResponse && error.status === 503) {
      return { status: 503, message: NOTIFICATIONS_UNAVAILABLE_MESSAGE };
    }
    return toApiError(error);
  }
}
