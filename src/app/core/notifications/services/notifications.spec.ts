import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../../auth';
import type { AuthUser } from '../../auth';
import {
  NOTIFICATIONS_POLL_INTERVAL_MS as BASE,
  NOTIFICATIONS_POLL_MAX_INTERVAL_MS as MAX,
} from '../models/notifications.types';
import type { AppNotification } from '../models/notifications.types';
import { ToastService } from '../../../shared/ui/toast/toast-service';
import { NotificationsService } from './notifications';

const COUNT_URL = '/api/notifications/unread-count';

function user(rol: AuthUser['rol'], id = 'u1'): AuthUser {
  return { id, email: `${id}@agro.test`, nombre: 'Ana', rol, status: 'ACTIVE' };
}

function notification(
  id: string,
  readAt: string | null = null,
  patch: Partial<AppNotification> = {},
): AppNotification {
  return {
    id,
    plantilla: 'PAYMENT_APPROVED',
    destinatarioTipo: 'USER',
    titulo: 'Pago aprobado',
    mensaje: 'Tu pago fue aprobado',
    orderId: null,
    sentAt: '2026-11-09T10:00:00.000Z',
    readAt,
    ...patch,
  };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let session: SessionService;
  let http: HttpTestingController;

  /** Deja que corran los efectos y las promesas pendientes. */
  const settle = async (ms = 0) => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ms);
  };
  const login = (rol: AuthUser['rol'], id = 'u1') =>
    session.start({ accessToken: 'a', refreshToken: 'r' }, user(rol, id));
  const answerCount = async (count: number, seed: AppNotification[] = []) => {
    http.expectOne(COUNT_URL).flush({ count });
    await settle();
    // La primera respuesta siembra el aviso más reciente (GET /notifications?limit=1).
    http
      .match((r) => r.url === '/api/notifications' && r.params.get('limit') === '1')
      .forEach((req) => req.flush({ data: seed.slice(0, 1), nextCursor: null }));
    // Si el contador sube, se piden los últimos 5 para detectar avisos nuevos (sin toasts aquí).
    http
      .match((r) => r.url === '/api/notifications' && r.params.get('limit') === '5')
      .forEach((req) => req.flush({ data: [], nextCursor: null }));
    await settle();
  };
  const failCount = async (status: number) => {
    http.expectOne(COUNT_URL).flush({ message: 'x' }, { status, statusText: 'err' });
    await settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      service.stop();
      http.verify();
    } finally {
      session.clear();
      setVisibility('visible');
      vi.useRealTimers();
    }
  });

  describe('sondeo', () => {
    it('no hace peticiones sin sesión', async () => {
      service.start();
      await settle(BASE * 3);
      http.expectNone(COUNT_URL);
      expect(service.polling()).toBe(false);
    });

    it('no hace peticiones para ADMIN', async () => {
      login('ADMIN');
      service.start();
      await settle(BASE * 3);
      http.expectNone(COUNT_URL);
      expect(service.polling()).toBe(false);
    });

    it('no sondea mientras no se llame a start()', async () => {
      login('PRODUCTOR');
      await settle(BASE);
      http.expectNone(COUNT_URL);
    });

    it('con PRODUCTOR consulta de inmediato y publica el contador', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      expect(service.polling()).toBe(true);
      await answerCount(4);
      expect(service.unreadCount()).toBe(4);
      expect(service.degraded()).toBe(false);
    });

    it('con PROVEEDOR también sondea', async () => {
      login('PROVEEDOR');
      service.start();
      await settle();
      await answerCount(1);
      expect(service.unreadCount()).toBe(1);
    });

    it('repite cada 45 s', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(1);

      await settle(BASE - 1);
      http.expectNone(COUNT_URL);
      await settle(1);
      await answerCount(2);
      expect(service.unreadCount()).toBe(2);

      await settle(BASE);
      await answerCount(3);
      expect(service.unreadCount()).toBe(3);
    });

    it('con la pestaña oculta no hace ninguna petición', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(1);

      setVisibility('hidden');
      await settle(BASE * 4);
      http.expectNone(COUNT_URL);
    });

    it('al volver a verla consulta de inmediato y reanuda el ritmo', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(1);
      setVisibility('hidden');
      await settle(BASE * 2);
      http.expectNone(COUNT_URL);

      setVisibility('visible');
      await settle();
      await answerCount(5);
      expect(service.unreadCount()).toBe(5);

      await settle(BASE);
      await answerCount(6);
      expect(service.unreadCount()).toBe(6);
    });

    it('un 503 duplica la espera, marca degraded y un éxito vuelve a 45 s', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await failCount(503);
      expect(service.degraded()).toBe(true);

      await settle(BASE * 2 - 1);
      http.expectNone(COUNT_URL);
      await settle(1);
      await failCount(429);
      expect(service.degraded()).toBe(true);

      await settle(BASE * 4);
      await answerCount(2);
      expect(service.degraded()).toBe(false);
      expect(service.unreadCount()).toBe(2);

      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 2 });
    });

    it('la espera no pasa de 5 minutos', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      let wait = BASE;
      for (let i = 0; i < 6; i++) {
        await failCount(503);
        wait = Math.min(wait * 2, MAX);
        await settle(wait - 1);
        http.expectNone(COUNT_URL);
        await settle(1);
      }
      expect(wait).toBe(MAX);
      await failCount(503);
    });

    it('un error de red marca degraded sin cambiar la espera', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      http.expectOne(COUNT_URL).error(new ProgressEvent('error'));
      await settle();
      expect(service.degraded()).toBe(true);
      await settle(BASE);
      await answerCount(0);
      expect(service.degraded()).toBe(false);
    });

    it('stop limpia el temporizador y vacía el estado', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(3);
      service.stop();
      expect(service.polling()).toBe(false);
      expect(service.unreadCount()).toBe(0);
      await settle(BASE * 3);
      http.expectNone(COUNT_URL);
    });

    it('cerrar sesión detiene el sondeo y vacía contador y avisos', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(3);
      const load = service.loadList(10);
      http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({
          data: [notification('a')],
          nextCursor: null,
        });
      await load;
      expect(service.items().length).toBe(1);

      session.clear();
      await settle();
      expect(service.polling()).toBe(false);
      expect(service.unreadCount()).toBe(0);
      expect(service.items()).toEqual([]);
      await settle(BASE * 2);
      http.expectNone(COUNT_URL);
    });

    it('al activarse no descarta una lista pedida antes de start()', async () => {
      login('PRODUCTOR');
      const load = service.loadList(10);
      service.start();
      await settle();
      http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({
          data: [notification('a')],
          nextCursor: null,
        });
      await load;
      await answerCount(1);
      expect(service.items().map((n) => n.id)).toEqual(['a']);
      expect(service.listStatus()).toBe('ready');
    });

    it('un cambio de usuario descarta el estado del anterior', async () => {
      login('PRODUCTOR', 'u1');
      service.start();
      await settle();
      await answerCount(7);
      expect(service.unreadCount()).toBe(7);

      login('PRODUCTOR', 'u2');
      await settle();
      expect(service.unreadCount()).toBe(0);
      await answerCount(1);
      expect(service.unreadCount()).toBe(1);
    });

    it('al pasar a un rol sin avisos deja de sondear', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(2);
      login('ADMIN');
      await settle(BASE * 2);
      http.expectNone(COUNT_URL);
      expect(service.polling()).toBe(false);
    });

    it('una respuesta que llega tras cerrar sesión se descarta', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      const pending = http.expectOne(COUNT_URL);
      session.clear();
      await settle();
      pending.flush({ count: 9 });
      await settle();
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('lista y acciones', () => {
    async function ready(rol: AuthUser['rol'] = 'PRODUCTOR', count = 2) {
      login(rol);
      service.start();
      await settle();
      await answerCount(count);
    }

    async function load(items: AppNotification[], nextCursor: string | null = null) {
      const promise = service.loadList(10);
      const req = http.expectOne((r) => r.url === '/api/notifications');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ data: items, nextCursor });
      await promise;
    }

    it('loadList publica los avisos y hasMore según nextCursor', async () => {
      await ready();
      await load([notification('b'), notification('a')], 'a');
      expect(service.items().map((n) => n.id)).toEqual(['b', 'a']);
      expect(service.hasMore()).toBe(true);
      expect(service.listStatus()).toBe('ready');
    });

    it('un error de carga deja listStatus en error con el ApiError', async () => {
      await ready();
      const promise = service.loadList(10);
      http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({ message: 'x' }, { status: 503, statusText: 'err' });
      await promise;
      expect(service.listStatus()).toBe('error');
      expect(service.listError()?.status).toBe(503);
    });

    it('loadMore usa el cursor y no repite avisos', async () => {
      await ready();
      await load([notification('c'), notification('b')], 'b');
      const more = service.loadMore();
      const req = http.expectOne((r) => r.url === '/api/notifications');
      expect(req.request.params.get('cursor')).toBe('b');
      req.flush({ data: [notification('b'), notification('a')], nextCursor: null });
      await more;
      expect(service.items().map((n) => n.id)).toEqual(['c', 'b', 'a']);
      expect(service.hasMore()).toBe(false);
    });

    it('loadMore sin cursor no hace peticiones', async () => {
      await ready();
      await load([notification('a')], null);
      await service.loadMore();
      http.expectNone((r) => r.url === '/api/notifications');
    });

    it('markRead usa la respuesta del backend y baja el contador en uno', async () => {
      await ready('PRODUCTOR', 2);
      const unread = notification('a');
      await load([unread]);
      const promise = service.markRead(unread);
      const req = http.expectOne('/api/notifications/a/read');
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...unread, readAt: '2026-11-09T12:00:00.000Z' });
      expect(await promise).toEqual({ ok: true });
      expect(service.items()[0].readAt).toBe('2026-11-09T12:00:00.000Z');
      expect(service.unreadCount()).toBe(1);
    });

    it('markRead no baja el contador de 0', async () => {
      await ready('PRODUCTOR', 0);
      const unread = notification('a');
      await load([unread]);
      const promise = service.markRead(unread);
      http.expectOne('/api/notifications/a/read').flush({ ...unread, readAt: 'x' });
      await promise;
      expect(service.unreadCount()).toBe(0);
    });

    it('un aviso ya leído no llama al backend', async () => {
      await ready();
      const read = notification('a', '2026-11-09T11:00:00.000Z');
      expect(await service.markRead(read)).toEqual({ ok: true });
      http.expectNone('/api/notifications/a/read');
    });

    it('no permite un segundo envío mientras el primero está en curso', async () => {
      await ready();
      const unread = notification('a');
      const first = service.markRead(unread);
      const second = service.markRead(unread);
      http.expectOne('/api/notifications/a/read').flush({ ...unread, readAt: 'x' });
      await Promise.all([first, second]);
      expect(service.unreadCount()).toBe(1);
    });

    it('un error al marcar devuelve el ApiError y no toca el contador', async () => {
      await ready('PRODUCTOR', 2);
      const unread = notification('a');
      const promise = service.markRead(unread);
      http
        .expectOne('/api/notifications/a/read')
        .flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(service.unreadCount()).toBe(2);
    });

    it('markAllRead vuelve a pedir el contador y la primera página', async () => {
      await ready('PRODUCTOR', 2);
      await load([notification('b'), notification('a')]);
      const promise = service.markAllRead();
      expect(service.markingAll()).toBe(true);
      const post = http.expectOne('/api/notifications/read-all');
      expect(post.request.method).toBe('POST');
      post.flush({ updated: 2 });
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 0 });
      http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({
          data: [notification('b', 'x'), notification('a', 'x')],
          nextCursor: null,
        });
      await promise;
      expect(service.markingAll()).toBe(false);
      expect(service.unreadCount()).toBe(0);
      expect(service.items().every((n) => n.readAt)).toBe(true);
    });

    it('markAllRead ignora un segundo envío en curso', async () => {
      await ready();
      const first = service.markAllRead();
      await service.markAllRead();
      http.expectOne('/api/notifications/read-all').flush({ updated: 0 });
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 0 });
      http.expectOne((r) => r.url === '/api/notifications').flush({ data: [], nextCursor: null });
      await first;
    });
  });

  describe('toasts de avisos nuevos', () => {
    // ids de 24 hex que crecen con la letra final, como los ObjectId por orden de llegada
    const id = (suffix: string) => `64f0c0a1b2c3d4e5f6a7b8c${suffix}`;
    const item = (suffix: string, readAt: string | null = null) =>
      notification(id(suffix), readAt, { titulo: `Aviso ${suffix}` });
    const toastTitles = () =>
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.title);
    const listLimit =
      (limit: string) => (r: { url: string; params: { get(k: string): string | null } }) =>
        r.url === '/api/notifications' && r.params.get('limit') === limit;

    async function startWith(count: number, existing: AppNotification[]) {
      login('PRODUCTOR');
      service.start();
      await settle();
      await answerCount(count, existing);
    }

    /** Sube el contador y responde la lista de los últimos 5. */
    async function riseTo(count: number, latest: AppNotification[]) {
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count });
      await settle();
      http.expectOne(listLimit('5')).flush({ data: latest, nextCursor: null });
      await settle();
    }

    it('siembra el aviso más reciente con limit=1 y no muestra toast al iniciar', async () => {
      login('PRODUCTOR');
      service.start();
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 3 });
      await settle();
      http.expectOne(listLimit('1')).flush({ data: [item('3')], nextCursor: null });
      await settle();
      expect(toastTitles()).toEqual([]);
    });

    it('muestra un toast por cada aviso nuevo sin leer, del más viejo al más nuevo', async () => {
      await startWith(1, [item('1')]);
      await riseTo(3, [item('3'), item('2'), item('1')]);
      expect(toastTitles()).toEqual(['Aviso 2', 'Aviso 3']);
      const toast = TestBed.inject(ToastService).toasts()[0];
      expect(toast.message).toContain('Tu pago fue aprobado');
      expect(toast.tone).toBe('brand');
    });

    it('no repite un aviso ya anunciado', async () => {
      await startWith(1, [item('1')]);
      await riseTo(2, [item('2'), item('1')]);
      expect(toastTitles()).toEqual(['Aviso 2']);
      TestBed.inject(ToastService).clear();

      // el contador sube por otro aviso: el 2 no vuelve a salir
      await riseTo(3, [item('3'), item('2'), item('1')]);
      expect(toastTitles()).toEqual(['Aviso 3']);
    });

    it('con más de 3 nuevos muestra 3 y el resumen «y N avisos más» con enlace', async () => {
      await startWith(0, []);
      await riseTo(5, [item('5'), item('4'), item('3'), item('2'), item('1')]);
      const toasts = TestBed.inject(ToastService).toasts();
      expect(toasts.map((t) => t.title)).toEqual([
        'Aviso 3',
        'Aviso 4',
        'Aviso 5',
        'y 2 avisos más',
      ]);
      expect(toasts[3].link).toEqual({ label: 'Ver todas', url: '/notificaciones' });
    });

    it('con exactamente 3 nuevos no hay resumen', async () => {
      await startWith(0, []);
      await riseTo(3, [item('3'), item('2'), item('1')]);
      expect(toastTitles()).toEqual(['Aviso 1', 'Aviso 2', 'Aviso 3']);
    });

    it('un aviso nuevo ya leído no genera toast', async () => {
      await startWith(1, [item('1')]);
      await riseTo(2, [item('3', 'x'), item('2'), item('1')]);
      expect(toastTitles()).toEqual(['Aviso 2']);
    });

    it('no emite nada ni pide la lista si el contador baja o se mantiene', async () => {
      await startWith(3, [item('3')]);
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 2 });
      await settle();
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 2 });
      await settle();
      http.expectNone(listLimit('5'));
      expect(toastTitles()).toEqual([]);
    });

    it('marcar un aviso como leído y reconciliar el contador no genera toast', async () => {
      await startWith(2, [item('2')]);
      const promise = service.markRead(item('2'));
      http.expectOne(`/api/notifications/${id('2')}/read`).flush(item('2', 'x'));
      await promise;
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 1 });
      await settle();
      http.expectNone(listLimit('5'));
      expect(toastTitles()).toEqual([]);
    });

    it('si la lista falla no hay toast ni error y el sondeo sigue', async () => {
      await startWith(0, []);
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 1 });
      await settle();
      http.expectOne(listLimit('5')).flush({ message: 'x' }, { status: 503, statusText: 'err' });
      await settle();
      expect(toastTitles()).toEqual([]);
      await settle(BASE);
      http.expectOne(COUNT_URL).flush({ count: 1 });
    });

    it('con bandeja vacía al iniciar, el primer aviso nuevo sí se anuncia', async () => {
      await startWith(0, []);
      await riseTo(1, [item('1')]);
      expect(toastTitles()).toEqual(['Aviso 1']);
    });

    it('un nuevo inicio de sesión de otro usuario vuelve a sembrar sin toasts', async () => {
      await startWith(2, [item('2')]);
      login('PRODUCTOR', 'u2');
      await settle();
      await answerCount(5, [item('5')]);
      expect(toastTitles()).toEqual([]);
    });
  });
});
