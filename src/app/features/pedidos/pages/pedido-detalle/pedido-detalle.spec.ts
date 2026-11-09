import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Order, OrderStatus } from '../../models/pedidos.types';
import { PedidoDetalle } from './pedido-detalle';

const ID = '507f1f77bcf86cd799439011';
const START = Date.parse('2026-11-09T10:00:00.000Z');

function order(status: OrderStatus, patch: Partial<Order> = {}): Order {
  return {
    id: ID,
    buyerId: 'u1',
    total: 230000,
    moneda: 'COP',
    status,
    createdAt: '2026-11-09T09:59:00.000Z',
    subOrders: [
      {
        id: 'so1',
        storeId: 's1',
        subtotal: 230000,
        items: [
          {
            id: 'i1',
            variantId: 'v1',
            productId: 'p1',
            nombreProducto: 'Abono orgánico',
            presentacion: 'Bulto',
            unidad: 'kg',
            precioUnitario: 115000,
            cantidad: 2,
            subtotal: 230000,
          },
        ],
      },
    ],
    ...patch,
  };
}

describe('PedidoDetalle', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'pedidos/:id', component: PedidoDetalle }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.match(() => true);
    vi.useRealTimers();
  });

  const root = () => harness.routeNativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const orderUrl = `/api/orders/${ID}`;
  /** La carga inicial se pide tras el primer ciclo de detección: se espera a que aparezca. */
  const firstRequest = () => vi.waitFor(() => http.expectOne(orderUrl));

  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  /** Abre la pantalla y responde el pedido y los nombres de tienda. */
  async function open(first: Order) {
    const nav = harness.navigateByUrl(`/pedidos/${ID}`, PedidoDetalle);
    (await firstRequest()).flush(first);
    await nav;
    const store = await vi.waitFor(() => http.expectOne('/api/catalog/stores/s1'));
    store.flush({ id: 's1', nombre: 'Tienda Verde', municipio: 'Rionegro' });
    await settle();
  }

  it('muestra el estado, el total y los ítems por tienda con el snapshot', async () => {
    await open(order('CONFIRMED'));
    expect(text()).toContain('Confirmado');
    expect(text()).toContain('$ 230.000');
    expect(text()).toContain('Tienda Verde');
    expect(text()).toContain('Abono orgánico');
    expect(text()).toContain('Bulto · kg');
    expect(text()).toContain('$ 115.000');
  });

  it('CONFIRMED no muestra el botón Pagar', async () => {
    await open(order('CONFIRMED'));
    expect(text()).toContain('Pedido confirmado');
    expect(root().querySelector('a[href$="/pago"]')).toBeNull();
  });

  it('CANCELLED con expiresAt dice que venció sin pago y no ofrece pagar', async () => {
    await open(order('CANCELLED', { expiresAt: '2026-11-09T10:14:00.000Z' }));
    expect(text()).toContain('El pedido venció sin pago');
    expect(root().querySelector('a[href$="/pago"]')).toBeNull();
  });

  it('CANCELLED sin expiresAt dice que no se pudo reservar el stock', async () => {
    await open(order('CANCELLED'));
    expect(text()).toContain('No se pudo reservar el stock');
  });

  it('AWAITING_PAYMENT muestra cronómetro, total y Pagar hacia /pedidos/:id/pago', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    await open(order('AWAITING_PAYMENT', { expiresAt }));
    expect(root().querySelector('[role="timer"]')?.textContent).toMatch(/^1[45]:\d\d$/);
    expect(text()).toContain('$ 230.000');
    expect(root().querySelector('a[href$="/pago"]')?.getAttribute('href')).toBe(
      `/pedidos/${ID}/pago`,
    );
  });

  it('un pedido ajeno o inexistente (404) muestra "Pedido no encontrado"', async () => {
    const nav = harness.navigateByUrl(`/pedidos/${ID}`, PedidoDetalle);
    (await firstRequest()).flush(
      { message: 'Pedido no encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    await nav;
    await settle();
    expect(text()).toContain('Pedido no encontrado');
    expect(root().querySelector('a[href="/pedidos"]')).not.toBeNull();
  });

  it('un id con formato inválido muestra "Pedido no encontrado" sin pedir nada', async () => {
    await harness.navigateByUrl('/pedidos/xyz', PedidoDetalle);
    harness.detectChanges();
    expect(text()).toContain('Pedido no encontrado');
    http.expectNone((r) => r.url.startsWith('/api/orders'));
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const nav = harness.navigateByUrl(`/pedidos/${ID}`, PedidoDetalle);
    (await firstRequest()).error(new ProgressEvent('error'));
    await nav;
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    [...root().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))
      ?.click();
    const again = await vi.waitFor(() => http.expectOne(orderUrl));
    again.flush(order('CONFIRMED'));
    const store = await vi.waitFor(() => http.expectOne('/api/catalog/stores/s1'));
    store.flush({ id: 's1', nombre: 'Tienda Verde', municipio: 'Rionegro' });
    await settle();
    expect(text()).toContain('Confirmado');
  });

  describe('sondeo y temporizadores', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      vi.setSystemTime(START);
    });

    async function openPending() {
      const nav = harness.navigateByUrl(`/pedidos/${ID}`, PedidoDetalle);
      (await firstRequest()).flush(order('PENDING'));
      await nav;
      const store = await vi.waitFor(() => http.expectOne('/api/catalog/stores/s1'));
      store.flush({ id: 's1', nombre: 'Tienda Verde', municipio: 'Rionegro' });
      await harness.fixture.whenStable();
      harness.detectChanges();
    }

    const tick = async (ms: number) => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
    };

    it('mientras está PENDING vuelve a consultar cada 2 segundos', async () => {
      await openPending();
      expect(text()).toContain('Estamos reservando el stock');
      await tick(2000);
      http.expectOne(orderUrl).flush(order('PENDING'));
      await tick(2000);
      http.expectOne(orderUrl).flush(order('PENDING'));
    });

    it('se detiene al pasar a otro estado', async () => {
      await openPending();
      await tick(2000);
      http
        .expectOne(orderUrl)
        .flush(order('AWAITING_PAYMENT', { expiresAt: new Date(Date.now() + 900_000).toISOString() }));
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(text()).toContain('Esperando pago');
      await tick(10_000);
      http.expectNone(orderUrl);
    });

    it('se detiene al destruir la pantalla', async () => {
      await openPending();
      harness.fixture.destroy();
      await tick(10_000);
      http.expectNone(orderUrl);
    });

    it('un fallo durante el sondeo no borra lo ya mostrado y se reintenta en el siguiente ciclo', async () => {
      await openPending();
      await tick(2000);
      http.expectOne(orderUrl).error(new ProgressEvent('error'));
      harness.detectChanges();
      expect(text()).toContain('Estamos reservando el stock');
      expect(text()).not.toContain('No se pudo conectar');
      await tick(2000);
      http.expectOne(orderUrl).flush(order('CANCELLED'));
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(text()).toContain('No se pudo reservar el stock');
    });

    it('al llegar el cronómetro a 0 vuelve a consultar y muestra lo que diga el backend', async () => {
      const nav = harness.navigateByUrl(`/pedidos/${ID}`, PedidoDetalle);
      (await firstRequest()).flush(
        order('AWAITING_PAYMENT', { expiresAt: new Date(Date.now() + 3000).toISOString() }),
      );
      await nav;
      const store = await vi.waitFor(() => http.expectOne('/api/catalog/stores/s1'));
      store.flush({ id: 's1', nombre: 'Tienda Verde', municipio: 'Rionegro' });
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(root().querySelector('[role="timer"]')?.textContent?.trim()).toBe('00:03');

      await tick(3000);
      harness.detectChanges();
      const refetch = await vi.waitFor(() => http.expectOne(orderUrl));
      refetch.flush(order('CANCELLED', { expiresAt: new Date(START).toISOString() }));
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(text()).toContain('El pedido venció sin pago');
    });
  });
});
