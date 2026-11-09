import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Order, OrderStatus } from '../../../../core/orders';
import { Payment, PaymentStatus } from '../../../../core/payments';
import { PagoDetalle } from './pago-detalle';

const ID = '607f1f77bcf86cd799439022';
const ORDER_ID = '507f1f77bcf86cd799439011';
const START = Date.parse('2026-11-09T10:00:00.000Z');
const PAYMENT_URL = `/api/payments/${ID}`;
const ORDER_URL = `/api/orders/${ORDER_ID}`;

function payment(status: PaymentStatus, patch: Partial<Payment> = {}): Payment {
  return {
    id: ID,
    orderId: ORDER_ID,
    monto: 230000,
    moneda: 'COP',
    metodo: 'NEQUI',
    status,
    createdAt: '2026-11-09T09:58:00.000Z',
    ...(status === 'APPROVED' ? { referencia: 'SIM-77' } : {}),
    ...patch,
  };
}

function order(status: OrderStatus, expiresAt?: string): Order {
  return {
    id: ORDER_ID,
    buyerId: 'u1',
    total: 230000,
    moneda: 'COP',
    status,
    createdAt: '2026-11-09T09:55:00.000Z',
    ...(expiresAt ? { expiresAt } : {}),
    subOrders: [],
  };
}

describe('PagoDetalle', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'pagos/:id', component: PagoDetalle }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    http.match(() => true);
    vi.useRealTimers();
  });

  const root = () => harness.routeNativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ');
  const button = (label: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.includes(label));

  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await Promise.resolve();
    harness.detectChanges();
  }

  async function request(url: string) {
    for (let i = 0; i < 100; i++) {
      harness.detectChanges();
      await Promise.resolve();
      const found = http.match(url);
      if (found.length) {
        return found[0];
      }
    }
    throw new Error(`No llegó la petición ${url}`);
  }

  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    harness.detectChanges();
  };

  async function open(p: Payment, o?: Order) {
    const nav = harness.navigateByUrl(`/pagos/${ID}`, PagoDetalle);
    (await request(PAYMENT_URL)).flush(p);
    await nav;
    if (o) {
      (await request(ORDER_URL)).flush(o);
    }
    await settle();
  }

  it('muestra monto, método, estado, referencia y fecha, con enlace al pedido', async () => {
    await open(payment('APPROVED'));
    expect(text()).toContain('Aprobado');
    expect(text()).toContain('$ 230.000');
    expect(text()).toContain('Nequi');
    expect(text()).toContain('SIM-77');
    expect(text()).toContain('2026');
    expect(root().querySelector(`a[href="/pedidos/${ORDER_ID}"]`)).not.toBeNull();
    expect(button('Reintentar pago')).toBeUndefined();
    expect(root().querySelector('a[href$="/pago"]')).toBeNull();
  });

  it('un pago rechazado con el pedido aún pagable ofrece Reintentar pago', async () => {
    await open(
      payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }),
      order('AWAITING_PAYMENT', new Date(START + 10 * 60_000).toISOString()),
    );
    expect(text()).toContain('Fondos insuficientes');
    expect(root().querySelector(`a[href="/pedidos/${ORDER_ID}/pago"]`)?.textContent).toContain(
      'Reintentar pago',
    );
  });

  it('un pago con error con el pedido pagable ofrece Reintentar pago', async () => {
    await open(
      payment('ERROR', { motivoRechazo: 'GATEWAY_ERROR' }),
      order('AWAITING_PAYMENT', new Date(START + 10 * 60_000).toISOString()),
    );
    expect(root().querySelector(`a[href="/pedidos/${ORDER_ID}/pago"]`)).not.toBeNull();
  });

  it.each([
    ['vencido', order('AWAITING_PAYMENT', new Date(START - 1000).toISOString())],
    ['cancelado', order('CANCELLED')],
    ['confirmado', order('CONFIRMED')],
  ])('un pago rechazado con el pedido %s no ofrece Reintentar pago', async (_label, o) => {
    await open(payment('DECLINED'), o);
    expect(root().querySelector(`a[href="/pedidos/${ORDER_ID}"]`)).not.toBeNull();
    expect(root().querySelector(`a[href="/pedidos/${ORDER_ID}/pago"]`)).toBeNull();
  });

  it('un pago ajeno o inexistente (404) muestra "Pago no encontrado" con enlace a /pagos', async () => {
    const nav = harness.navigateByUrl(`/pagos/${ID}`, PagoDetalle);
    (await request(PAYMENT_URL)).flush(
      { message: 'Pago no encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    await nav;
    await settle();
    expect(text()).toContain('Pago no encontrado');
    expect(root().querySelectorAll('a[href="/pagos"]').length).toBeGreaterThan(0);
  });

  it('un id con formato inválido muestra "Pago no encontrado" sin pedir nada', async () => {
    await harness.navigateByUrl('/pagos/xyz', PagoDetalle);
    harness.detectChanges();
    expect(text()).toContain('Pago no encontrado');
    http.expectNone((r) => r.url.startsWith('/api'));
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const nav = harness.navigateByUrl(`/pagos/${ID}`, PagoDetalle);
    (await request(PAYMENT_URL)).error(new ProgressEvent('error'));
    await nav;
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    button('Reintentar')?.click();
    (await request(PAYMENT_URL)).flush(payment('APPROVED'));
    await settle();
    expect(text()).toContain('Aprobado');
  });

  describe('pago en proceso', () => {
    it('lo vuelve a consultar cada 8 segundos y se detiene al cambiar de estado', async () => {
      await open(payment('PROCESSING'));
      expect(text()).toContain('Pago en proceso');
      await advance(7999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      await advance(8000);
      (await request(PAYMENT_URL)).flush(payment('APPROVED'));
      await settle();
      expect(text()).toContain('Aprobado');
      expect(text()).not.toContain('Consultando el estado');
      await advance(60_000);
      http.expectNone(PAYMENT_URL);
    });

    it('se detiene a los 2 minutos y ofrece Actualizar', async () => {
      await open(payment('PROCESSING'));
      for (let i = 0; i < 15; i++) {
        await advance(8000);
        (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      }
      await settle();
      expect(text()).toContain('pendiente de confirmación');
      await advance(60_000);
      http.expectNone(PAYMENT_URL);

      button('Actualizar')?.click();
      (await request(PAYMENT_URL)).flush(payment('APPROVED'));
      await settle();
      expect(text()).toContain('Aprobado');
    });

    it('un 429 duplica el intervalo y un fallo de red no borra lo mostrado', async () => {
      await open(payment('PROCESSING'));
      await advance(8000);
      (await request(PAYMENT_URL)).flush(null, { status: 429, statusText: 'Too Many Requests' });
      await advance(15_999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).error(new ProgressEvent('error'));
      await settle();
      expect(text()).toContain('Pago en proceso');
      expect(text()).toContain('$ 230.000');
    });

    it('se detiene al destruir la pantalla', async () => {
      await open(payment('PROCESSING'));
      harness.fixture.destroy();
      await advance(60_000);
      http.expectNone(PAYMENT_URL);
    });
  });
});
