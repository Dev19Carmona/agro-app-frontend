import {
  DOCUMENT,
  DestroyRef,
  Service,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../auth';
import { ToastService } from '../../../shared/ui/toast/toast-service';
import type { ApiError } from '../../http';
import {
  AppNotification,
  NOTIFICATIONS_POLL_INTERVAL_MS,
  NOTIFICATIONS_TOAST_DURATION_MS,
  NOTIFICATIONS_TOAST_FETCH_SIZE,
  NOTIFICATIONS_TOAST_MAX,
  PROVIDER_SUB_ORDERS_MAX_PAGES,
  PROVIDER_SUB_ORDERS_PAGE_SIZE,
} from '../models/notifications.types';
import { PROVIDER_ORDERS_PATH, notificationLink } from '../utils/notification-link';
import { notificationPresentation } from '../utils/notification-presentation';
import { nextPollInterval, shouldBackOff } from '../utils/poll-interval';
import { NotificationsApi } from './notifications-api';

/** Resultado de una acción sobre los avisos; el error ya viene como `ApiError`. */
export type NotificationsResult = { ok: true } | { ok: false; error: ApiError };

export type NotificationsListStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Avisos del `PRODUCTOR` y del `PROVEEDOR`. Mantiene el contador de no leídos (sondeo de
 * `GET /notifications/unread-count`) y la lista cargada, que comparten la campana y
 * `/notificaciones`. No guarda nada entre sesiones: se vacía al cerrar sesión o al cambiar de
 * usuario.
 *
 * `AppShell` llama a `start()` y a `stop()`. Sondea cada 45 s; con la pestaña oculta no hace
 * peticiones y al volver a verla consulta de inmediato. Un `429` o un `503` duplican la espera
 * hasta 5 minutos y la primera respuesta correcta la devuelve a 45 s.
 */
@Service()
export class NotificationsService {
  private readonly api = inject(NotificationsApi);
  private readonly session = inject(SessionService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  private readonly enabled = signal(false);
  private readonly _polling = signal(false);
  private readonly _degraded = signal(false);
  private readonly _unreadCount = signal(0);
  private readonly _items = signal<readonly AppNotification[]>([]);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _listStatus = signal<NotificationsListStatus>('idle');
  private readonly _listError = signal<ApiError | null>(null);
  private readonly _markingAll = signal(false);

  /** Se incrementa al detener o cambiar de sesión: una respuesta anterior se descarta. */
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay = NOTIFICATIONS_POLL_INTERVAL_MS;
  private inFlight = false;
  private listLimit = 0;
  private readonly markingIds = new Set<string>();
  private visibilityBound = false;
  /** Usuario para el que corre el sondeo, o `null` si no hay. */
  private activeUser: string | null = null;
  /** Ya hubo una respuesta correcta del contador (la primera no genera toast). */
  private countKnown = false;
  /** Ya se sembró `lastSeenId` con el aviso más reciente que existía al iniciar. */
  private seeded = false;
  private seeding = false;
  private announcing = false;
  /** `id` del aviso más reciente que ya se vio; los de `id` mayor son nuevos. */
  private lastSeenId: string | null = null;

  /** Avisos sin leer; `0` mientras no haya respuesta. */
  readonly unreadCount = this._unreadCount.asReadonly();
  /** `true` si hay sondeo activo (rol `PRODUCTOR` o `PROVEEDOR` con sesión). */
  readonly polling = this._polling.asReadonly();
  /** `true` tras un fallo del último sondeo: la campana no muestra insignia. */
  readonly degraded = this._degraded.asReadonly();

  /** Avisos cargados, del más nuevo al más viejo. */
  readonly items = this._items.asReadonly();
  readonly hasMore = computed(() => this._nextCursor() !== null);
  readonly listStatus = this._listStatus.asReadonly();
  readonly listError = this._listError.asReadonly();
  readonly markingAll = this._markingAll.asReadonly();

  private readonly onVisibilityChange = (): void => {
    if (this._polling() && this.document.visibilityState !== 'hidden') {
      this.clearTimer();
      void this.poll();
    }
  };

  constructor() {
    effect(() => {
      const enabled = this.enabled();
      const role = this.session.role();
      const userId = this.session.user()?.id ?? null;
      const eligible = enabled && (role === 'PRODUCTOR' || role === 'PROVEEDOR');
      const key = eligible ? userId : null;
      untracked(() => {
        const previous = this.activeUser;
        if (key === previous) {
          return;
        }
        this.activeUser = key;
        // Al activarse no se borra nada (la página pudo pedir su lista antes); al salir de un
        // usuario o cambiar a otro sí se vacía todo.
        if (previous !== null) {
          this.reset();
        }
        if (key) {
          this.startPolling();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  /** Activa el sondeo; solo corre con sesión de `PRODUCTOR` o `PROVEEDOR`. */
  start(): void {
    this.enabled.set(true);
  }

  /** Detiene el sondeo y vacía el estado. */
  stop(): void {
    this.enabled.set(false);
    this.activeUser = null;
    this.reset();
  }

  /** Pide el contador una vez, sin tocar el temporizador (reconcilia tras una acción). */
  async refreshUnread(): Promise<void> {
    const generation = this.generation;
    try {
      const { count } = await firstValueFrom(this.api.unreadCount());
      if (generation === this.generation) {
        this._unreadCount.set(count);
      }
    } catch {
      // El sondeo siguiente lo reconcilia.
    }
  }

  /** Carga la primera página (`limit` avisos) y reemplaza la lista. */
  async loadList(limit: number): Promise<void> {
    const generation = this.generation;
    this.listLimit = limit;
    if (this._listStatus() !== 'ready') {
      this._listStatus.set('loading');
    }
    try {
      const page = await firstValueFrom(this.api.list({ limit }));
      if (generation !== this.generation) {
        return;
      }
      this._items.set(page.data);
      this._nextCursor.set(page.nextCursor);
      this._listError.set(null);
      this._listStatus.set('ready');
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this._listError.set(error as ApiError);
      this._listStatus.set('error');
    }
  }

  /** Añade la página siguiente (por cursor) sin repetir avisos. */
  async loadMore(): Promise<NotificationsResult> {
    const cursor = this._nextCursor();
    if (!cursor || this._listStatus() === 'loading') {
      return { ok: true };
    }
    const generation = this.generation;
    this._listStatus.set('loading');
    try {
      const page = await firstValueFrom(this.api.list({ limit: this.listLimit, cursor }));
      if (generation !== this.generation) {
        return { ok: true };
      }
      this._items.update((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...page.data.filter((item) => !known.has(item.id))];
      });
      this._nextCursor.set(page.nextCursor);
      this._listError.set(null);
      this._listStatus.set('ready');
      return { ok: true };
    } catch (error) {
      if (generation === this.generation) {
        this._listError.set(error as ApiError);
        this._listStatus.set('ready');
      }
      return { ok: false, error: error as ApiError };
    }
  }

  /**
   * Marca un aviso como leído. Uno ya leído no llama al backend. Con la respuesta se actualiza la
   * fila y el contador baja en uno (sin bajar de 0) hasta que el sondeo lo reconcilie.
   */
  async markRead(notification: AppNotification): Promise<NotificationsResult> {
    if (notification.readAt || this.markingIds.has(notification.id)) {
      return { ok: true };
    }
    const generation = this.generation;
    this.markingIds.add(notification.id);
    try {
      const updated = await firstValueFrom(this.api.markRead(notification.id));
      if (generation === this.generation) {
        this._items.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this._unreadCount.update((count) => Math.max(0, count - 1));
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error as ApiError };
    } finally {
      this.markingIds.delete(notification.id);
    }
  }

  /**
   * Gesto de pulsar un aviso: lo marca como leído y, si trae pedido, navega a él según el rol
   * (los de cuenta solo se marcan). Devuelve el destino inmediato, o `null` si no hay enlace.
   *
   * El `PROVEEDOR` va al detalle de su sub-pedido: se busca el que tiene ese `orderId` y, si no
   * aparece (o la búsqueda falla), se navega a la lista de pedidos recibidos.
   */
  open(notification: AppNotification): string | null {
    const link = notificationLink(notification.orderId, this.session.role());
    void this.markRead(notification);
    if (link && notification.orderId) {
      void this.navigateTo(notification.orderId, link);
    }
    return link;
  }

  private async navigateTo(orderId: string, fallback: string): Promise<void> {
    const generation = this.generation;
    let target = fallback;
    if (this.session.role() === 'PROVEEDOR') {
      const subOrderId = await this.findProviderSubOrderId(orderId);
      if (generation !== this.generation) {
        return;
      }
      if (subOrderId) {
        target = `${PROVIDER_ORDERS_PATH}/${subOrderId}`;
      }
    }
    await this.router.navigateByUrl(target);
  }

  /** Busca, en las primeras páginas (más nuevos primero), el sub-pedido de un pedido. */
  private async findProviderSubOrderId(orderId: string): Promise<string | null> {
    try {
      for (let page = 1; page <= PROVIDER_SUB_ORDERS_MAX_PAGES; page++) {
        const result = await firstValueFrom(
          this.api.listProviderSubOrders(page, PROVIDER_SUB_ORDERS_PAGE_SIZE),
        );
        const found = result.data.find((subOrder) => subOrder.orderId === orderId);
        if (found) {
          return found.id;
        }
        if (page >= result.totalPages) {
          break;
        }
      }
    } catch {
      // Sin detalle exacto: se cae a la lista.
    }
    return null;
  }

  /** Marca todos como leídos y vuelve a pedir el contador y la primera página. */
  async markAllRead(): Promise<NotificationsResult> {
    if (this._markingAll()) {
      return { ok: true };
    }
    const generation = this.generation;
    this._markingAll.set(true);
    try {
      await firstValueFrom(this.api.markAllRead());
    } catch (error) {
      this._markingAll.set(false);
      return { ok: false, error: error as ApiError };
    }
    try {
      if (generation === this.generation) {
        await Promise.all([this.refreshUnread(), this.loadList(this.listLimit || 10)]);
      }
    } finally {
      this._markingAll.set(false);
    }
    return { ok: true };
  }

  /** Detiene el sondeo y vacía todo el estado. */
  private reset(): void {
    this.generation++;
    this.clearTimer();
    this.unbindVisibility();
    this.inFlight = false;
    this.delay = NOTIFICATIONS_POLL_INTERVAL_MS;
    this.listLimit = 0;
    this.markingIds.clear();
    this._polling.set(false);
    this._degraded.set(false);
    this._unreadCount.set(0);
    this._items.set([]);
    this._nextCursor.set(null);
    this._listStatus.set('idle');
    this._listError.set(null);
    this._markingAll.set(false);
    this.countKnown = false;
    this.seeded = false;
    this.seeding = false;
    this.announcing = false;
    this.lastSeenId = null;
  }

  private startPolling(): void {
    this._polling.set(true);
    this.bindVisibility();
    void this.poll();
  }

  /** Una consulta del contador y la siguiente programada. Con la pestaña oculta no hace nada. */
  private async poll(): Promise<void> {
    if (this.inFlight || !this._polling()) {
      return;
    }
    if (this.document.visibilityState === 'hidden') {
      // Sin petición ni temporizador: `visibilitychange` reanuda el sondeo.
      return;
    }
    const generation = this.generation;
    this.inFlight = true;
    try {
      const { count } = await firstValueFrom(this.api.unreadCount());
      if (generation !== this.generation) {
        return;
      }
      const previous = this._unreadCount();
      const known = this.countKnown;
      this._unreadCount.set(count);
      this.countKnown = true;
      this._degraded.set(false);
      this.delay = nextPollInterval(this.delay, 'ok');
      if (!known || !this.seeded) {
        void this.seedLastSeen(generation);
      } else if (count > previous) {
        void this.announceNew(generation, count - previous);
      }
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this._degraded.set(true);
      if (shouldBackOff((error as ApiError).status)) {
        this.delay = nextPollInterval(this.delay, 'backoff');
      }
    } finally {
      if (generation === this.generation) {
        this.inFlight = false;
      }
    }
    if (generation === this.generation) {
      this.timer = setTimeout(() => void this.poll(), this.delay);
    }
  }

  /** Guarda el id del aviso más reciente que ya existe, sin mostrar toast. */
  private async seedLastSeen(generation: number): Promise<void> {
    if (this.seeding) {
      return;
    }
    this.seeding = true;
    try {
      const page = await firstValueFrom(this.api.list({ limit: 1 }));
      if (generation === this.generation) {
        this.lastSeenId = page.data[0]?.id ?? null;
        this.seeded = true;
      }
    } catch {
      // Se reintenta con el siguiente sondeo correcto.
    } finally {
      if (generation === this.generation) {
        this.seeding = false;
      }
    }
  }

  /**
   * El contador subió: pide los últimos avisos y muestra un toast por cada uno sin leer con `id`
   * mayor que el último visto (hasta `NOTIFICATIONS_TOAST_MAX`), más «y N avisos más» si sobran.
   */
  private async announceNew(generation: number, delta: number): Promise<void> {
    if (this.announcing) {
      return;
    }
    this.announcing = true;
    try {
      const page = await firstValueFrom(this.api.list({ limit: NOTIFICATIONS_TOAST_FETCH_SIZE }));
      if (generation !== this.generation) {
        return;
      }
      const seen = this.lastSeenId;
      const isNew = (item: AppNotification) => seen === null || item.id > seen;
      const newest = page.data[0];
      if (newest && isNew(newest)) {
        this.lastSeenId = newest.id;
      }
      const fresh = page.data.filter((item) => item.readAt === null && isNew(item));
      const shown = fresh.slice(0, NOTIFICATIONS_TOAST_MAX).reverse();
      for (const item of shown) {
        this.toasts.show({
          title: item.titulo,
          message: item.mensaje,
          tone: notificationPresentation(item.plantilla).tone,
          durationMs: NOTIFICATIONS_TOAST_DURATION_MS,
        });
      }
      const extra = Math.max(fresh.length, fresh.length > 0 ? delta : 0) - shown.length;
      if (extra > 0) {
        this.toasts.show({
          title: `y ${extra} ${extra === 1 ? 'aviso más' : 'avisos más'}`,
          tone: 'info',
          link: { label: 'Ver todas', url: '/notificaciones' },
          durationMs: NOTIFICATIONS_TOAST_DURATION_MS,
        });
      }
    } catch {
      // Sin toast: el contador ya se actualizó y el panel mostrará los avisos.
    } finally {
      if (generation === this.generation) {
        this.announcing = false;
      }
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private bindVisibility(): void {
    if (!this.visibilityBound) {
      this.document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.visibilityBound = true;
    }
  }

  private unbindVisibility(): void {
    if (this.visibilityBound) {
      this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.visibilityBound = false;
    }
  }
}
