import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../http';
import { NotificationsApi } from './notifications-api';

const NOTIFICATION = {
  id: '64f0c0a1b2c3d4e5f6a7b8c9',
  plantilla: 'PAYMENT_APPROVED',
  destinatarioTipo: 'USER',
  titulo: 'Pago aprobado',
  mensaje: 'Tu pago fue aprobado',
  orderId: '64f0c0a1b2c3d4e5f6a7b8ca',
  sentAt: '2026-11-09T10:00:00.000Z',
  readAt: null,
} as const;

describe('NotificationsApi', () => {
  let api: NotificationsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NotificationsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list hace GET /api/notifications sin parámetros por defecto', () => {
    api.list().subscribe();
    const req = http.expectOne('/api/notifications');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ data: [], nextCursor: null });
  });

  it('list envía limit y cursor solo cuando tienen valor', () => {
    api.list({ limit: 20, cursor: '64f0c0a1b2c3d4e5f6a7b8c9' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/notifications');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('cursor')).toBe('64f0c0a1b2c3d4e5f6a7b8c9');
    req.flush({ data: [NOTIFICATION], nextCursor: null });

    api.list({ limit: 10, cursor: null }).subscribe();
    const second = http.expectOne((r) => r.url === '/api/notifications');
    expect(second.request.params.has('cursor')).toBe(false);
    second.flush({ data: [], nextCursor: null });
  });

  it('nunca envía userId ni storeId', () => {
    api.list({ limit: 5 }).subscribe();
    const list = http.expectOne((r) => r.url === '/api/notifications');
    expect(list.request.params.has('userId')).toBe(false);
    expect(list.request.params.has('storeId')).toBe(false);
    list.flush({ data: [], nextCursor: null });

    api.markRead('64f0c0a1b2c3d4e5f6a7b8c9').subscribe();
    const read = http.expectOne('/api/notifications/64f0c0a1b2c3d4e5f6a7b8c9/read');
    expect(JSON.stringify(read.request.body)).not.toMatch(/userId|storeId/);
    read.flush(NOTIFICATION);

    api.markAllRead().subscribe();
    const all = http.expectOne('/api/notifications/read-all');
    expect(JSON.stringify(all.request.body)).not.toMatch(/userId|storeId/);
    all.flush({ updated: 0 });
  });

  it('unreadCount hace GET /api/notifications/unread-count', () => {
    let count: number | undefined;
    api.unreadCount().subscribe((r) => (count = r.count));
    const req = http.expectOne('/api/notifications/unread-count');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 4 });
    expect(count).toBe(4);
  });

  it('markRead hace PATCH /api/notifications/:id/read y devuelve el aviso', () => {
    let result: unknown;
    api.markRead('64f0c0a1b2c3d4e5f6a7b8c9').subscribe((r) => (result = r));
    const req = http.expectOne('/api/notifications/64f0c0a1b2c3d4e5f6a7b8c9/read');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...NOTIFICATION, readAt: '2026-11-09T11:00:00.000Z' });
    expect(result).toMatchObject({ readAt: '2026-11-09T11:00:00.000Z' });
  });

  it('markAllRead hace POST /api/notifications/read-all', () => {
    let updated: number | undefined;
    api.markAllRead().subscribe((r) => (updated = r.updated));
    const req = http.expectOne('/api/notifications/read-all');
    expect(req.request.method).toBe('POST');
    req.flush({ updated: 3 });
    expect(updated).toBe(3);
  });

  it('los errores salen como ApiError', () => {
    let error: ApiError | undefined;
    api.unreadCount().subscribe({ error: (e: ApiError) => (error = e) });
    http
      .expectOne('/api/notifications/unread-count')
      .flush({ message: 'servicio caído' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error?.status).toBe(503);
    expect(error).not.toBeInstanceOf(HttpErrorResponse);
  });
});
