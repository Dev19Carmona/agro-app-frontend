import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppRole, SessionService } from '../../../auth';
import type { AppNotification } from '../../models/notifications.types';
import { NotificationsService } from '../../services/notifications';
import { NotificationBell } from './notification-bell';

const COUNT_URL = '/api/notifications/unread-count';
const ORDER_ID = '64f0c0a1b2c3d4e5f6a7b8c9';

function notification(patch: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'a',
    plantilla: 'PAYMENT_APPROVED',
    destinatarioTipo: 'USER',
    titulo: 'Pago aprobado',
    mensaje: `El pago del pedido ${ORDER_ID} fue aprobado`,
    orderId: ORDER_ID,
    sentAt: '2026-11-09T15:30:00.000Z',
    readAt: null,
    ...patch,
  };
}

async function settle(f: ComponentFixture<unknown>) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
  f.detectChanges();
  await f.whenStable();
}

async function setup(rol: AppRole = 'PRODUCTOR', count = 0) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const session = TestBed.inject(SessionService);
  session.start(
    { accessToken: 'a', refreshToken: 'r' },
    { id: '1', email: 'ana@agro.test', nombre: 'Ana', rol, status: 'ACTIVE' },
  );
  const http = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(NotificationsService);
  const fixture = TestBed.createComponent(NotificationBell);
  service.start();
  await settle(fixture);
  http.expectOne(COUNT_URL).flush({ count });
  await settle(fixture);
  http
    .expectOne((r) => r.url === '/api/notifications' && r.params.get('limit') === '1')
    .flush({ data: [], nextCursor: null });
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  const trigger = () => el.querySelector('button[appPopoverTrigger]') as HTMLButtonElement;
  const panel = () => document.querySelector('[role="dialog"]') as HTMLElement | null;
  const openPanel = async (items: AppNotification[], nextCursor: string | null = null) => {
    trigger().click();
    await settle(fixture);
    const req = http.expectOne((r) => r.url === '/api/notifications');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ data: items, nextCursor });
    await settle(fixture);
  };
  const rows = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('app-notification-item button'));
  const byText = (text: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((b) =>
      b.textContent?.includes(text),
    );
  return { fixture, el, http, service, session, trigger, panel, openPanel, rows, byText };
}

describe('NotificationBell', () => {
  afterEach(() => {
    TestBed.inject(NotificationsService).stop();
    TestBed.resetTestingModule();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    localStorage.clear();
  });

  describe('insignia', () => {
    it('con 0 no muestra insignia y el nombre es solo «Notificaciones»', async () => {
      const { trigger, el } = await setup('PRODUCTOR', 0);
      expect(trigger().getAttribute('aria-label')).toBe('Notificaciones');
      expect(el.querySelector('.bg-brand')).toBeNull();
    });

    it('con 5 muestra 5 y el nombre dice «Notificaciones, 5 sin leer»', async () => {
      const { trigger, el } = await setup('PRODUCTOR', 5);
      expect(trigger().getAttribute('aria-label')).toBe('Notificaciones, 5 sin leer');
      expect(el.querySelector('.bg-brand')?.textContent?.trim()).toBe('5');
    });

    it('con 100 muestra 99+', async () => {
      const { trigger, el } = await setup('PRODUCTOR', 100);
      expect(el.querySelector('.bg-brand')?.textContent?.trim()).toBe('99+');
      expect(trigger().getAttribute('aria-label')).toBe('Notificaciones, 100 sin leer');
    });

    it('anuncia el contador en una región aria-live oculta', async () => {
      const { el } = await setup('PRODUCTOR', 3);
      const live = el.querySelector('[aria-live="polite"]') as HTMLElement;
      expect(live.classList.contains('sr-only')).toBe(true);
      expect(live.textContent).toContain('3 notificaciones sin leer');
    });

    it('con el sondeo degradado no hay insignia', async () => {
      const ctx = await setup('PRODUCTOR', 4);
      (ctx.service as unknown as { _degraded: { set(v: boolean): void } })._degraded.set(true);
      await settle(ctx.fixture);
      expect(ctx.el.querySelector('.bg-brand')).toBeNull();
      expect(ctx.trigger().getAttribute('aria-label')).toBe('Notificaciones');
    });
  });

  describe('panel', () => {
    it('al abrirlo pide los últimos 10 y los muestra', async () => {
      const ctx = await setup('PRODUCTOR', 2);
      await ctx.openPanel([notification({ id: 'b', titulo: 'Segundo' }), notification()]);
      expect(ctx.panel()).not.toBeNull();
      expect(ctx.rows().length).toBe(2);
      expect(ctx.panel()!.textContent).toContain('Segundo');
      expect(ctx.panel()!.querySelector('a[href="/notificaciones"]')?.textContent).toContain(
        'Ver todas',
      );
    });

    it('sin avisos muestra «No tienes notificaciones»', async () => {
      const ctx = await setup();
      await ctx.openPanel([]);
      expect(ctx.panel()!.textContent).toContain('No tienes notificaciones');
    });

    it('con 503 muestra el mensaje del servicio y Reintentar vuelve a pedir', async () => {
      const ctx = await setup();
      ctx.trigger().click();
      await settle(ctx.fixture);
      ctx.http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({ message: 'x' }, { status: 503, statusText: 'err' });
      await settle(ctx.fixture);
      expect(ctx.panel()!.textContent).toContain(
        'El servicio de notificaciones no está disponible',
      );
      ctx.byText('Reintentar')!.click();
      await settle(ctx.fixture);
      ctx.http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({ data: [], nextCursor: null });
    });

    it('sin conexión muestra «No se pudo conectar con el servidor»', async () => {
      const ctx = await setup();
      ctx.trigger().click();
      await settle(ctx.fixture);
      ctx.http.expectOne((r) => r.url === '/api/notifications').error(new ProgressEvent('error'));
      await settle(ctx.fixture);
      expect(ctx.panel()!.textContent).toContain('No se pudo conectar con el servidor');
    });
  });

  describe('clic en un aviso', () => {
    it('productor: marca como leído, navega a /pedidos/:orderId y baja el contador', async () => {
      const ctx = await setup('PRODUCTOR', 2);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await ctx.openPanel([notification()]);
      ctx.rows()[0].click();
      await settle(ctx.fixture);
      const patch = ctx.http.expectOne('/api/notifications/a/read');
      expect(patch.request.method).toBe('PATCH');
      patch.flush(notification({ readAt: '2026-11-09T16:00:00.000Z' }));
      await settle(ctx.fixture);
      expect(navigate).toHaveBeenCalledWith(`/pedidos/${ORDER_ID}`);
      expect(ctx.service.unreadCount()).toBe(1);
      expect(ctx.panel()).toBeNull();
    });

    const SUB_ORDERS = '/api/orders/provider/sub-orders';

    async function clickStoreNotice() {
      const ctx = await setup('PROVEEDOR', 1);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await ctx.openPanel([notification({ plantilla: 'ORDER_CONFIRMED_STORE' })]);
      ctx.rows()[0].click();
      await settle(ctx.fixture);
      ctx.http
        .expectOne('/api/notifications/a/read')
        .flush(notification({ readAt: '2026-11-09T16:00:00.000Z' }));
      await settle(ctx.fixture);
      return { ctx, navigate };
    }

    it('proveedor: busca el sub-pedido del aviso y navega a su detalle', async () => {
      const { ctx, navigate } = await clickStoreNotice();
      const req = ctx.http.expectOne((r) => r.url === SUB_ORDERS);
      expect(req.request.params.get('page')).toBe('1');
      req.flush({
        data: [
          { id: 'sub-otro', orderId: 'ffffffffffffffffffffffff' },
          { id: 'sub-1', orderId: ORDER_ID },
        ],
        page: 1,
        totalPages: 1,
      });
      await settle(ctx.fixture);
      expect(navigate).toHaveBeenCalledWith('/proveedor/pedidos/sub-1');
    });

    it('proveedor: sigue buscando en la página siguiente', async () => {
      const { ctx, navigate } = await clickStoreNotice();
      ctx.http
        .expectOne((r) => r.url === SUB_ORDERS && r.params.get('page') === '1')
        .flush({
          data: [{ id: 'x', orderId: 'ffffffffffffffffffffffff' }],
          page: 1,
          totalPages: 2,
        });
      await settle(ctx.fixture);
      ctx.http
        .expectOne((r) => r.url === SUB_ORDERS && r.params.get('page') === '2')
        .flush({ data: [{ id: 'sub-2', orderId: ORDER_ID }], page: 2, totalPages: 2 });
      await settle(ctx.fixture);
      expect(navigate).toHaveBeenCalledWith('/proveedor/pedidos/sub-2');
    });

    it('proveedor: si no encuentra el sub-pedido navega a la lista', async () => {
      const { ctx, navigate } = await clickStoreNotice();
      ctx.http.expectOne((r) => r.url === SUB_ORDERS).flush({ data: [], page: 1, totalPages: 1 });
      await settle(ctx.fixture);
      expect(navigate).toHaveBeenCalledWith('/proveedor/pedidos');
    });

    it('proveedor: si la búsqueda falla navega a la lista', async () => {
      const { ctx, navigate } = await clickStoreNotice();
      ctx.http
        .expectOne((r) => r.url === SUB_ORDERS)
        .flush({ message: 'x' }, { status: 500, statusText: 'err' });
      await settle(ctx.fixture);
      expect(navigate).toHaveBeenCalledWith('/proveedor/pedidos');
    });

    it('un aviso de cuenta solo se marca como leído y no navega', async () => {
      const ctx = await setup('PROVEEDOR', 1);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const account = notification({ plantilla: 'PROVIDER_APPROVED', orderId: null });
      await ctx.openPanel([account]);
      ctx.rows()[0].click();
      await settle(ctx.fixture);
      ctx.http
        .expectOne('/api/notifications/a/read')
        .flush({ ...account, readAt: '2026-11-09T16:00:00.000Z' });
      await settle(ctx.fixture);
      expect(navigate).not.toHaveBeenCalled();
      expect(ctx.panel()).not.toBeNull();
      expect(ctx.service.unreadCount()).toBe(0);
    });

    it('un aviso ya leído solo navega, sin llamar al backend', async () => {
      const ctx = await setup('PRODUCTOR', 0);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await ctx.openPanel([notification({ readAt: '2026-11-09T16:00:00.000Z' })]);
      ctx.rows()[0].click();
      await settle(ctx.fixture);
      ctx.http.expectNone('/api/notifications/a/read');
      expect(navigate).toHaveBeenCalledWith(`/pedidos/${ORDER_ID}`);
    });
  });

  describe('Marcar todas como leídas', () => {
    it('envía POST read-all y deja el contador en 0 con los avisos leídos', async () => {
      const ctx = await setup('PRODUCTOR', 2);
      await ctx.openPanel([notification({ id: 'b' }), notification()]);
      ctx.byText('Marcar todas como leídas')!.click();
      await settle(ctx.fixture);
      const post = ctx.http.expectOne('/api/notifications/read-all');
      expect(post.request.method).toBe('POST');
      post.flush({ updated: 2 });
      await settle(ctx.fixture);
      ctx.http.expectOne(COUNT_URL).flush({ count: 0 });
      ctx.http
        .expectOne((r) => r.url === '/api/notifications')
        .flush({
          data: [notification({ id: 'b', readAt: 'x' }), notification({ readAt: 'x' })],
          nextCursor: null,
        });
      await settle(ctx.fixture);
      expect(ctx.service.unreadCount()).toBe(0);
      expect(ctx.panel()!.querySelectorAll('.sr-only').length).toBe(0);
    });

    it('con 0 sin leer el botón queda deshabilitado', async () => {
      const ctx = await setup('PRODUCTOR', 0);
      await ctx.openPanel([notification({ readAt: 'x' })]);
      expect(ctx.byText('Marcar todas como leídas')!.disabled).toBe(true);
    });
  });
});
