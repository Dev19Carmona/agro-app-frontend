import { HttpRequest } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Order, OrderStatus } from '../../../../core/orders';
import { PaymentForm } from '../../components/payment-form/payment-form';
import { Payment, PaymentStatus } from '../../models/pagos.types';
import { PagarPedido } from './pagar-pedido';

const ID = '507f1f77bcf86cd799439011';
const PID = '607f1f77bcf86cd799439022';
const START = Date.parse('2026-11-09T10:00:00.000Z');
const IN_15_MIN = new Date(START + 15 * 60_000).toISOString();

const ORDER_URL = `/api/orders/${ID}`;
const PAYMENT_URL = `/api/payments/${PID}`;

function order(status: OrderStatus, patch: Partial<Order> = {}): Order {
  return {
    id: ID,
    buyerId: 'u1',
    total: 230000,
    moneda: 'COP',
    status,
    createdAt: '2026-11-09T09:59:00.000Z',
    ...(status === 'AWAITING_PAYMENT' ? { expiresAt: IN_15_MIN } : {}),
    subOrders: [],
    ...patch,
  };
}

function payment(status: PaymentStatus, patch: Partial<Payment> = {}): Payment {
  return {
    id: PID,
    orderId: ID,
    monto: 230000,
    moneda: 'COP',
    metodo: 'CARD',
    status,
    createdAt: '2026-11-09T10:00:00.000Z',
    ...(status === 'APPROVED' ? { referencia: 'SIM-1' } : {}),
    ...patch,
  };
}

function page(data: Payment[]) {
  return { data, page: 1, limit: 1, total: data.length, totalPages: 1 };
}

const isList = (r: HttpRequest<unknown>) =>
  r.method === 'GET' && r.url === '/api/payments' && r.params.get('orderId') === ID;
const isCreate = (r: HttpRequest<unknown>) => r.method === 'POST' && r.url === '/api/payments';

interface FormInternals {
  model: WritableSignal<{ metodo: string; escenario: string; otroToken: string }>;
}

describe('PagarPedido', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'pedidos/:id/pago', component: PagarPedido }]),
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
  const hasForm = () => root().querySelector('app-payment-form') !== null;

  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await Promise.resolve();
    harness.detectChanges();
  }

  /** Espera (solo con microtareas, porque los temporizadores están simulados) una petición. */
  async function request(match: string | ((r: HttpRequest<unknown>) => boolean)) {
    for (let i = 0; i < 100; i++) {
      harness.detectChanges();
      await Promise.resolve();
      const found = http.match(match as never);
      if (found.length) {
        return found[0];
      }
    }
    throw new Error('No llegó la petición esperada');
  }

  /** Responde una recarga completa (pedido y último pago), como la que sigue a `loaded.reload()`. */
  async function answerReload(o: Order, last: Payment | null = null) {
    const orderReq = await request(ORDER_URL);
    const listReq = await request(isList);
    orderReq.flush(o);
    listReq.flush(page(last ? [last] : []));
  }

  async function open(o: Order, last: Payment | null = null) {
    const nav = harness.navigateByUrl(`/pedidos/${ID}/pago`, PagarPedido);
    await answerReload(o, last);
    await nav;
    await settle();
  }

  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    harness.detectChanges();
  };

  /** Elige un escenario y envía el formulario. */
  async function submitForm(escenario = 'approved', metodo = 'CARD', otroToken = '') {
    const form = harness.fixture.debugElement.query(By.directive(PaymentForm))
      .componentInstance as FormInternals;
    form.model.set({ metodo, escenario, otroToken });
    await settle();
    (root().querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  }

  const button = (label: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.includes(label));

  describe('carga', () => {
    it('un id con formato inválido muestra "Pedido no encontrado" sin pedir nada', async () => {
      await harness.navigateByUrl('/pedidos/xyz/pago', PagarPedido);
      harness.detectChanges();
      expect(text()).toContain('Pedido no encontrado');
      expect(root().querySelector('a[href="/pedidos"]')).not.toBeNull();
      http.expectNone((r) => r.url.startsWith('/api'));
    });

    it('un pedido ajeno o inexistente (404) muestra "Pedido no encontrado"', async () => {
      const nav = harness.navigateByUrl(`/pedidos/${ID}/pago`, PagarPedido);
      const orderReq = await request(ORDER_URL);
      const listReq = await request(isList);
      // `forkJoin` cancela la otra petición cuando una falla.
      orderReq.flush({ message: 'Pedido no encontrado' }, { status: 404, statusText: 'Not Found' });
      expect(listReq.cancelled).toBe(true);
      await nav;
      await settle();
      expect(text()).toContain('Pedido no encontrado');
      expect(root().querySelector('a[href="/pedidos"]')).not.toBeNull();
    });

    it('con el backend apagado muestra el error con Reintentar', async () => {
      const nav = harness.navigateByUrl(`/pedidos/${ID}/pago`, PagarPedido);
      const orderReq = await request(ORDER_URL);
      const listReq = await request(isList);
      orderReq.error(new ProgressEvent('error'));
      expect(listReq.cancelled).toBe(true);
      await nav;
      await settle();
      expect(text()).toContain('No se pudo conectar con el servidor');
      button('Reintentar')?.click();
      await answerReload(order('AWAITING_PAYMENT'));
      await settle();
      expect(hasForm()).toBe(true);
    });

    it('pide el último pago del pedido con orderId y limit=1', async () => {
      const nav = harness.navigateByUrl(`/pedidos/${ID}/pago`, PagarPedido);
      const listReq = await request(isList);
      expect(listReq.request.params.get('limit')).toBe('1');
      expect(listReq.request.params.get('page')).toBe('1');
      (await request(ORDER_URL)).flush(order('AWAITING_PAYMENT'));
      listReq.flush(page([]));
      await nav;
    });
  });

  describe('pedido pagable', () => {
    it('muestra monto, estado y cronómetro, y un formulario sin monto ni datos de tarjeta', async () => {
      await open(order('AWAITING_PAYMENT'));
      expect(text()).toContain('$ 230.000');
      expect(text()).toContain('Esperando pago');
      expect(root().querySelector('[role="timer"]')?.textContent).toMatch(/^1[45]:\d\d$/);
      expect(hasForm()).toBe(true);
      expect(text()).toContain('Simulador de pagos');
      expect(root().querySelectorAll('input').length).toBe(0);
    });

    it.each([
      ['PENDING', 'El pedido aún se está preparando'],
      ['CONFIRMED', 'Este pedido ya está confirmado'],
      ['CANCELLED', 'Este pedido está cancelado'],
    ] as const)(
      'un pedido %s explica por qué no se paga, con enlace al pedido',
      async (status, title) => {
        await open(order(status));
        expect(text()).toContain(title);
        expect(hasForm()).toBe(false);
        expect(root().querySelector(`a[href="/pedidos/${ID}"]`)).not.toBeNull();
      },
    );

    it('un pedido AWAITING_PAYMENT vencido no muestra el formulario', async () => {
      const expired = order('AWAITING_PAYMENT', {
        expiresAt: new Date(START - 1000).toISOString(),
      });
      const nav = harness.navigateByUrl(`/pedidos/${ID}/pago`, PagarPedido);
      await answerReload(expired);
      await nav;
      // El cronómetro ya está en 0: avisa y la pantalla vuelve a consultar; manda el backend.
      await answerReload(expired);
      await settle();
      expect(text()).toContain('El tiempo para pagar venció');
      expect(hasForm()).toBe(false);
    });
  });

  describe('pago existente', () => {
    it('un pago PROCESSING se muestra en lugar del formulario', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      expect(text()).toContain('Pago en proceso');
      expect(hasForm()).toBe(false);
    });

    it('un pago PENDING se muestra en lugar del formulario', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PENDING'));
      expect(text()).toContain('Pago en proceso');
      expect(hasForm()).toBe(false);
    });

    it('un pago APPROVED con el pedido confirmado ofrece los enlaces y no el formulario', async () => {
      await open(order('CONFIRMED'), payment('APPROVED'));
      expect(text()).toContain('Pago aprobado');
      expect(text()).toContain('SIM-1');
      expect(hasForm()).toBe(false);
      expect(root().querySelector(`a[href="/pedidos/${ID}"]`)).not.toBeNull();
      expect(root().querySelector('a[href="/pagos"]')).not.toBeNull();
    });

    it('un pago rechazado anterior se muestra y el formulario sigue disponible', async () => {
      await open(
        order('AWAITING_PAYMENT'),
        payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }),
      );
      expect(text()).toContain('Fondos insuficientes');
      expect(hasForm()).toBe(true);
    });
  });

  describe('sondeo de un pago en proceso', () => {
    it('consulta el pago cada 8 segundos', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      await advance(7999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      await advance(7999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
    });

    it('se detiene al cambiar de estado', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      await advance(8000);
      (await request(PAYMENT_URL)).flush(
        payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }),
      );
      await settle();
      expect(text()).toContain('Pago rechazado');
      expect(hasForm()).toBe(true);
      await advance(60_000);
      http.expectNone(PAYMENT_URL);
    });

    it('se detiene a los 2 minutos y ofrece Actualizar', async () => {
      await open(
        order('AWAITING_PAYMENT', { expiresAt: new Date(START + 30 * 60_000).toISOString() }),
        payment('PROCESSING'),
      );
      for (let i = 0; i < 15; i++) {
        await advance(8000);
        (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      }
      await settle();
      expect(text()).toContain('pendiente de confirmación');
      expect(button('Actualizar')).toBeDefined();
      await advance(60_000);
      http.expectNone(PAYMENT_URL);

      // Actualizar consulta ahora y reinicia el sondeo.
      button('Actualizar')?.click();
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      (await request(ORDER_URL)).flush(order('AWAITING_PAYMENT'));
      await settle();
      await advance(8000);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
    });

    it('un 429 omite el ciclo y duplica el intervalo hasta 30 segundos', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      await advance(8000);
      (await request(PAYMENT_URL)).flush(null, { status: 429, statusText: 'Too Many Requests' });
      await advance(15_999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).flush(null, { status: 429, statusText: 'Too Many Requests' });
      await advance(29_999);
      http.expectNone(PAYMENT_URL);
      await advance(1);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      // Sin 429 vuelve a 8 segundos.
      await advance(8000);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
      expect(text()).toContain('Pago en proceso');
    });

    it('un fallo de red durante el sondeo no borra lo ya mostrado', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      await advance(8000);
      (await request(PAYMENT_URL)).error(new ProgressEvent('error'));
      await settle();
      expect(text()).toContain('Pago en proceso');
      await advance(8000);
      (await request(PAYMENT_URL)).flush(payment('APPROVED'));
    });

    it('se detiene al destruir la pantalla', async () => {
      await open(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      harness.fixture.destroy();
      await advance(60_000);
      http.expectNone(PAYMENT_URL);
      http.expectNone(ORDER_URL);
    });
  });

  describe('pagar', () => {
    it('Aprobado envía POST con Idempotency-Key de 8 a 100 caracteres y el token del escenario', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved', 'NEQUI');
      const req = await request(isCreate);
      const key = req.request.headers.get('Idempotency-Key') ?? '';
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key.length).toBeLessThanOrEqual(100);
      expect(req.request.body).toEqual({
        orderId: ID,
        metodo: 'NEQUI',
        token: 'tok_test_approved',
      });
      req.flush(payment('APPROVED', { metodo: 'NEQUI' }), { status: 201, statusText: 'Created' });
      await settle();
      expect(text()).toContain('Pago aprobado');
      expect(text()).toContain('SIM-1');
      expect(hasForm()).toBe(false);
    });

    it('durante el envío el botón se deshabilita y un doble clic no genera dos cobros', async () => {
      await open(order('AWAITING_PAYMENT'));
      const form = harness.fixture.debugElement.query(By.directive(PaymentForm))
        .componentInstance as FormInternals;
      form.model.set({ metodo: 'CARD', escenario: 'approved', otroToken: '' });
      await settle();
      const submit = root().querySelector('button[type="submit"]') as HTMLButtonElement;
      submit.click();
      submit.click();
      await settle();
      const created = http.match(isCreate);
      expect(created.length).toBe(1);
      const current = root().querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(current.disabled).toBe(true);
      expect(current.textContent).toContain('Procesando pago…');
      expect(root().querySelector('form')?.getAttribute('aria-busy')).toBe('true');
      created[0].flush(payment('APPROVED'));
    });

    it('tras un pago aprobado espera a que el pedido esté CONFIRMED antes de ofrecer los enlaces', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm();
      (await request(isCreate)).flush(payment('APPROVED'));
      await settle();
      expect(text()).toContain('Confirmando tu pedido');
      expect(root().querySelector('a[href="/pagos"]')).toBeNull();

      await advance(2000);
      (await request(ORDER_URL)).flush(order('AWAITING_PAYMENT'));
      await advance(2000);
      (await request(ORDER_URL)).flush(order('CONFIRMED'));
      await settle();
      expect(text()).toContain('Tu pedido quedó confirmado');
      expect(root().querySelector(`a[href="/pedidos/${ID}"]`)).not.toBeNull();
      expect(root().querySelector('a[href="/pagos"]')).not.toBeNull();
      await advance(10_000);
      http.expectNone(ORDER_URL);
    });

    it('si el pedido no se confirma en 30 segundos avisa y ofrece Actualizar', async () => {
      await open(
        order('AWAITING_PAYMENT', { expiresAt: new Date(START + 60 * 60_000).toISOString() }),
      );
      await submitForm();
      (await request(isCreate)).flush(payment('APPROVED'));
      await settle();
      for (let i = 0; i < 15; i++) {
        await advance(2000);
        (await request(ORDER_URL)).flush(
          order('AWAITING_PAYMENT', { expiresAt: new Date(START + 60 * 60_000).toISOString() }),
        );
      }
      await settle();
      expect(text()).toContain('el pedido aún no aparece confirmado');
      await advance(10_000);
      http.expectNone(ORDER_URL);

      button('Actualizar')?.click();
      (await request(PAYMENT_URL)).flush(payment('APPROVED'));
      (await request(ORDER_URL)).flush(order('CONFIRMED'));
      await settle();
      expect(text()).toContain('Tu pedido quedó confirmado');
    });

    it('un rechazo muestra "Fondos insuficientes", mantiene el formulario y el reintento usa otra clave', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('declined');
      const first = await request(isCreate);
      const firstKey = first.request.headers.get('Idempotency-Key');
      first.flush(payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }));
      await settle();
      expect(text()).toContain('Fondos insuficientes');
      expect(hasForm()).toBe(true);

      await submitForm('declined');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
      second.flush(payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }));
    });

    it('un error de pasarela muestra el mensaje de reintento y permite otro intento con clave nueva', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('error');
      const first = await request(isCreate);
      const firstKey = first.request.headers.get('Idempotency-Key');
      first.flush(payment('ERROR', { motivoRechazo: 'GATEWAY_ERROR' }));
      await settle();
      expect(text()).toContain('Falla de la pasarela, intenta de nuevo');
      expect(hasForm()).toBe(true);

      await submitForm('approved');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
      second.flush(payment('APPROVED'));
    });

    it('un token propio se envía tal cual y muestra el rechazo del backend', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('custom', 'PSE', 'tok_inventado');
      const req = await request(isCreate);
      expect(req.request.body.token).toBe('tok_inventado');
      req.flush(payment('DECLINED', { motivoRechazo: 'INVALID_TOKEN' }));
      await settle();
      expect(text()).toContain('El token de pago no es válido');
    });

    it('el escenario Pendiente deja el pago en proceso y empieza a sondear', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('pending');
      (await request(isCreate)).flush(payment('PROCESSING'));
      await settle();
      expect(text()).toContain('Pago en proceso');
      expect(hasForm()).toBe(false);
      await advance(8000);
      (await request(PAYMENT_URL)).flush(payment('PROCESSING'));
    });

    it('tras un error de red reintenta con la misma clave y aclara que no se cobra dos veces', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved');
      const first = await request(isCreate);
      const key = first.request.headers.get('Idempotency-Key');
      first.error(new ProgressEvent('error'));
      await settle();
      expect(text()).toContain('No se pudo conectar con el servidor');
      expect(text()).toContain('no se repetirá al reintentar');
      expect((root().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
        false,
      );

      await submitForm('approved');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).toBe(key);
      second.flush(payment('APPROVED'), { status: 200, statusText: 'OK' });
    });

    it('cambiar el método tras un error de red genera otra clave', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved', 'CARD');
      const first = await request(isCreate);
      const key = first.request.headers.get('Idempotency-Key');
      first.error(new ProgressEvent('error'));
      await settle();
      await submitForm('approved', 'PSE');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).not.toBe(key);
      second.flush(payment('APPROVED'));
    });

    it('un 429 muestra el aviso, no bloquea el botón y conserva la clave', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved');
      const first = await request(isCreate);
      const key = first.request.headers.get('Idempotency-Key');
      first.flush(
        { message: 'ThrottlerException' },
        { status: 429, statusText: 'Too Many Requests' },
      );
      await settle();
      expect(text()).toContain('Demasiados intentos, espera un minuto');
      expect((root().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
        false,
      );

      await submitForm('approved');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).toBe(key);
      second.flush(payment('APPROVED'));
    });

    it('un 422 genera una clave nueva en el siguiente intento', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved');
      const first = await request(isCreate);
      const key = first.request.headers.get('Idempotency-Key');
      first.flush(
        { message: 'La Idempotency-Key ya se usó con otro cuerpo' },
        { status: 422, statusText: 'Unprocessable' },
      );
      await settle();
      await submitForm('approved');
      const second = await request(isCreate);
      expect(second.request.headers.get('Idempotency-Key')).not.toBe(key);
      second.flush(payment('APPROVED'));
    });

    it('un 409 ORDER_NOT_PAYABLE muestra "El pedido ya no admite pago" con enlace al pedido', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved');
      (await request(isCreate)).flush(
        { code: 'ORDER_NOT_PAYABLE', message: 'El pedido no admite pago' },
        { status: 409, statusText: 'Conflict' },
      );
      await answerReload(order('CANCELLED', { expiresAt: IN_15_MIN }));
      await settle();
      expect(text()).toContain('El pedido ya no admite pago');
      expect(hasForm()).toBe(false);
      expect(root().querySelector(`a[href="/pedidos/${ID}"]`)).not.toBeNull();
    });

    it('un 409 PAYMENT_IN_PROGRESS vuelve a cargar y muestra el pago en curso', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('approved');
      (await request(isCreate)).flush(
        { code: 'PAYMENT_IN_PROGRESS', message: 'El pedido ya tiene un pago en curso o aprobado' },
        { status: 409, statusText: 'Conflict' },
      );
      await answerReload(order('AWAITING_PAYMENT'), payment('PROCESSING'));
      await settle();
      expect(text()).toContain('Pago en proceso');
      expect(hasForm()).toBe(false);
    });

    it('ni el token ni la clave quedan en localStorage, sessionStorage ni en la URL', async () => {
      await open(order('AWAITING_PAYMENT'));
      await submitForm('custom', 'CARD', 'tok_secreto_123');
      const req = await request(isCreate);
      const key = req.request.headers.get('Idempotency-Key') ?? '';
      req.flush(payment('DECLINED', { motivoRechazo: 'INVALID_TOKEN' }));
      await settle();
      const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
      expect(stored).not.toContain('tok_secreto_123');
      expect(stored).not.toContain(key);
      expect(location.href).not.toContain('tok_secreto_123');
      expect(location.href).not.toContain(key);
    });
  });
});
