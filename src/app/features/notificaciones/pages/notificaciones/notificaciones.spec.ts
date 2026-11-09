import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../../core/auth';
import { NotificationsService } from '../../../../core/notifications';
import type { AppNotification } from '../../../../core/notifications';
import { Notificaciones } from './notificaciones';

const COUNT_URL = '/api/notifications/unread-count';
const ORDER_ID = '64f0c0a1b2c3d4e5f6a7b8c9';

function n(id: string, readAt: string | null = null, patch: Partial<AppNotification> = {}) {
  return {
    id,
    plantilla: 'PAYMENT_APPROVED',
    destinatarioTipo: 'USER',
    titulo: `Aviso ${id}`,
    mensaje: `El pago del pedido ${ORDER_ID} fue aprobado`,
    orderId: ORDER_ID,
    sentAt: '2026-11-09T15:30:00.000Z',
    readAt,
    ...patch,
  } as AppNotification;
}

async function setup(url = '/notificaciones') {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'notificaciones', component: Notificaciones }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const session = TestBed.inject(SessionService);
  session.start(
    { accessToken: 'a', refreshToken: 'r' },
    { id: '1', email: 'ana@agro.test', nombre: 'Ana', rol: 'PRODUCTOR', status: 'ACTIVE' },
  );
  const http = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(NotificationsService);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const isSeed = (r: { url: string; params: { get(k: string): string | null } }) =>
    r.url === '/api/notifications' && r.params.get('limit') === '1';
  const seed = () => http.expectOne(isSeed).flush({ data: [], nextCursor: null });
  const list = () =>
    http.expectOne((r) => r.url === '/api/notifications' && r.params.get('limit') !== '1');
  const rows = () => Array.from(el.querySelectorAll('app-notification-item'));
  const byText = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  return { harness, el, http, service, session, settle, list, rows, byText, seed };
}

describe('Notificaciones', () => {
  afterEach(() => {
    TestBed.inject(NotificationsService).stop();
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('pide la primera página de 20 y lista los avisos', async () => {
    const { settle, list, rows, el } = await setup();
    const req = list();
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('cursor')).toBe(false);
    req.flush({ data: [n('b'), n('a', 'x')], nextCursor: null });
    await settle();
    expect(rows().length).toBe(2);
    expect(el.querySelector('h1')?.textContent).toContain('Notificaciones');
  });

  it('Cargar más usa el cursor, no repite avisos y desaparece con nextCursor null', async () => {
    const { settle, list, rows, byText, http } = await setup();
    list().flush({ data: [n('c'), n('b')], nextCursor: 'b' });
    await settle();
    expect(byText('Cargar más')).toBeTruthy();

    byText('Cargar más')!.click();
    await settle();
    const more = http.expectOne((r) => r.url === '/api/notifications');
    expect(more.request.params.get('cursor')).toBe('b');
    more.flush({ data: [n('b'), n('a')], nextCursor: null });
    await settle();
    expect(rows().length).toBe(3);
    expect(byText('Cargar más')).toBeUndefined();
  });

  it('con nextCursor null desde el inicio no hay Cargar más', async () => {
    const { settle, list, byText } = await setup();
    list().flush({ data: [n('a')], nextCursor: null });
    await settle();
    expect(byText('Cargar más')).toBeUndefined();
  });

  it('sin avisos muestra «No tienes notificaciones»', async () => {
    const { settle, list, el } = await setup();
    list().flush({ data: [], nextCursor: null });
    await settle();
    expect(el.textContent).toContain('No tienes notificaciones');
  });

  it('con 503 muestra el mensaje del servicio y Reintentar vuelve a pedir', async () => {
    const { settle, list, el, byText } = await setup();
    list().flush({ message: 'x' }, { status: 503, statusText: 'err' });
    await settle();
    expect(el.textContent).toContain('El servicio de notificaciones no está disponible');
    byText('Reintentar')!.click();
    await settle();
    list().flush({ data: [], nextCursor: null });
  });

  it('sin conexión muestra «No se pudo conectar con el servidor»', async () => {
    const { settle, list, el } = await setup();
    list().error(new ProgressEvent('error'));
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
  });

  describe('filtro', () => {
    it('?filtro=no-leidas muestra solo los no leídos de lo cargado', async () => {
      const { settle, list, rows, byText } = await setup('/notificaciones?filtro=no-leidas');
      list().flush({ data: [n('c'), n('b', 'x'), n('a')], nextCursor: null });
      await settle();
      expect(rows().length).toBe(2);
      expect(byText('No leídas')!.getAttribute('aria-pressed')).toBe('true');
      expect(byText('Todas')!.getAttribute('aria-pressed')).toBe('false');
    });

    it('un valor inválido cae en «Todas»', async () => {
      const { settle, list, rows, byText } = await setup('/notificaciones?filtro=otra');
      list().flush({ data: [n('b', 'x'), n('a')], nextCursor: null });
      await settle();
      expect(rows().length).toBe(2);
      expect(byText('Todas')!.getAttribute('aria-pressed')).toBe('true');
    });

    it('al elegir No leídas escribe ?filtro= en la URL y filtra', async () => {
      const { settle, list, rows, byText, harness } = await setup();
      list().flush({ data: [n('b', 'x'), n('a')], nextCursor: null });
      await settle();
      byText('No leídas')!.click();
      await settle();
      expect(TestBed.inject(Router).url).toBe('/notificaciones?filtro=no-leidas');
      expect(rows().length).toBe(1);
      byText('Todas')!.click();
      await settle();
      expect(TestBed.inject(Router).url).toBe('/notificaciones');
      expect(rows().length).toBe(2);
      expect(harness).toBeTruthy();
    });

    it('sin avisos sin leer pero con más páginas ofrece Cargar más y lo explica', async () => {
      const { settle, list, el, byText } = await setup('/notificaciones?filtro=no-leidas');
      list().flush({ data: [n('b', 'x')], nextCursor: 'b' });
      await settle();
      expect(el.textContent).toContain('No hay avisos sin leer en lo cargado');
      expect(byText('Cargar más')).toBeTruthy();
    });

    it('sin avisos sin leer y sin más páginas no ofrece Cargar más', async () => {
      const { settle, list, el, byText } = await setup('/notificaciones?filtro=no-leidas');
      list().flush({ data: [n('b', 'x')], nextCursor: null });
      await settle();
      expect(el.textContent).not.toContain('en lo cargado');
      expect(el.textContent).toContain('No tienes avisos sin leer');
      expect(byText('Cargar más')).toBeUndefined();
    });
  });

  describe('acciones', () => {
    it('pulsar un aviso sin leer lo marca y navega al pedido del productor', async () => {
      const { settle, list, rows, http, service, seed } = await setup();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      service.start();
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 1 });
      await settle();
      seed();
      list().flush({ data: [n('a')], nextCursor: null });
      await settle();
      (rows()[0].querySelector('button') as HTMLButtonElement).click();
      await settle();
      const patch = http.expectOne('/api/notifications/a/read');
      expect(patch.request.method).toBe('PATCH');
      patch.flush(n('a', '2026-11-09T16:00:00.000Z'));
      await settle();
      expect(navigate).toHaveBeenCalledWith(`/pedidos/${ORDER_ID}`);
      expect(service.unreadCount()).toBe(0);
    });

    it('Marcar todas como leídas envía POST y recarga contador y primera página', async () => {
      const { settle, list, byText, http, service, seed } = await setup();
      service.start();
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 2 });
      await settle();
      seed();
      list().flush({ data: [n('b'), n('a')], nextCursor: null });
      await settle();
      byText('Marcar todas como leídas')!.click();
      await settle();
      http.expectOne('/api/notifications/read-all').flush({ updated: 2 });
      await settle();
      http.expectOne(COUNT_URL).flush({ count: 0 });
      list().flush({ data: [n('b', 'x'), n('a', 'x')], nextCursor: null });
      await settle();
      expect(service.unreadCount()).toBe(0);
      expect(byText('Marcar todas como leídas')!.disabled).toBe(true);
    });

    it('con 0 sin leer el botón Marcar todas queda deshabilitado', async () => {
      const { settle, list, byText } = await setup();
      list().flush({ data: [n('a', 'x')], nextCursor: null });
      await settle();
      expect(byText('Marcar todas como leídas')!.disabled).toBe(true);
    });
  });
});
