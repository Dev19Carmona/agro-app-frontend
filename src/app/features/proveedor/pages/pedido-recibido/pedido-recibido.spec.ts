import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProviderSubOrder } from '../../models/proveedor.types';
import { PedidoRecibido } from './pedido-recibido';

const ID = '507f1f77bcf86cd799439051';
const ORDER: ProviderSubOrder = {
  id: ID,
  orderId: '507f1f77bcf86cd799439052',
  status: 'CONFIRMED',
  subtotal: 180000,
  createdAt: '2026-11-08T15:30:00.000Z',
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      productId: 'p1',
      nombreProducto: 'Abono orgánico',
      presentacion: 'Bulto',
      unidad: '50 kg',
      precioUnitario: 90000,
      cantidad: 2,
      subtotal: 180000,
    },
  ],
};

async function setup(id = ID) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proveedor/pedidos/:id', component: PedidoRecibido }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/proveedor/pedidos/${id}`);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, settle, http };
}

describe('PedidoRecibido', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el estado, el pedido, el subtotal y los ítems', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/provider/sub-orders/${ID}`).flush(ORDER);
    await settle();
    expect(el.textContent).toContain('Pagado');
    expect(el.textContent).toContain(ORDER.orderId);
    expect(el.textContent).toMatch(/180\.000/);
    expect(el.querySelector('app-sub-order-items')?.textContent).toContain('Abono orgánico');
    expect(el.textContent).not.toMatch(/comprador:|total del pedido/i);
  });

  it('un 404 muestra «Pedido no encontrado» con enlace a la lista', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/orders/provider/sub-orders/${ID}`)
      .flush({ statusCode: 404, message: 'No existe' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(el.textContent).toContain('Pedido no encontrado');
    expect(el.querySelector('a[href="/proveedor/pedidos"]')).not.toBeNull();
  });

  it('un id con formato inválido no pide nada y muestra «Pedido no encontrado»', async () => {
    const { el, settle, http } = await setup('abc');
    await settle();
    http.expectNone((r) => r.url.startsWith('/api/orders/provider/sub-orders'));
    expect(el.textContent).toContain('Pedido no encontrado');
  });

  it('sin conexión muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/orders/provider/sub-orders/${ID}`).error(new ProgressEvent('e'));
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
    expect(
      Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Reintentar')),
    ).toBe(true);
  });
});
