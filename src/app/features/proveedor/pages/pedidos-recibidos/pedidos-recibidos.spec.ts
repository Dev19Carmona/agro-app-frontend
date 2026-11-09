import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProviderSubOrder } from '../../models/proveedor.types';
import { PedidosRecibidos } from './pedidos-recibidos';

const ORDER: ProviderSubOrder = {
  id: '507f1f77bcf86cd799439051',
  orderId: '507f1f77bcf86cd799439052',
  status: 'CONFIRMED',
  subtotal: 230000,
  createdAt: '2026-11-08T15:30:00.000Z',
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      productId: 'p1',
      nombreProducto: 'Abono',
      presentacion: 'Bulto',
      unidad: 'kg',
      precioUnitario: 90000,
      cantidad: 2,
      subtotal: 180000,
    },
    {
      id: 'i2',
      variantId: 'v2',
      productId: 'p2',
      nombreProducto: 'Semilla',
      presentacion: 'Saco',
      unidad: 'kg',
      precioUnitario: 50000,
      cantidad: 1,
      subtotal: 50000,
    },
  ],
};

function pageOf(data: ProviderSubOrder[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/proveedor/pedidos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proveedor/pedidos', component: PedidosRecibidos }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, settle, http, harness };
}

describe('PedidosRecibidos', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista los sub-pedidos con fecha, estado, ítems y subtotal, sin comprador ni total', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne((r) => r.url === '/api/orders/provider/sub-orders')
      .flush(pageOf([ORDER]));
    await settle();
    const row = el.querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(row).toContain('Pagado');
    expect(row).toContain('2 ítems');
    expect(row).toMatch(/230\.000/);
    expect(row).toMatch(/2026/);
    expect(el.textContent).not.toMatch(/comprador:|total del pedido/i);
    expect(el.textContent).toContain('1 pedido');
    expect(
      el.querySelector(`a[href="/proveedor/pedidos/${ORDER.id}"]`)?.getAttribute('aria-label'),
    ).toContain('Ver el pedido del');
  });

  it('sin pedidos muestra el estado vacío', async () => {
    const { el, settle, http } = await setup();
    http.expectOne((r) => r.url === '/api/orders/provider/sub-orders').flush(pageOf([], 1, 0));
    await settle();
    expect(el.textContent).toContain('Aún no has recibido pedidos');
    expect(el.querySelector('table')).toBeNull();
  });

  it('pide ?page= con limit 10 y navega a otra página', async () => {
    const { el, settle, http } = await setup('/proveedor/pedidos?page=2');
    const first = http.expectOne((r) => r.url === '/api/orders/provider/sub-orders');
    expect(first.request.params.get('page')).toBe('2');
    expect(first.request.params.get('limit')).toBe('10');
    first.flush(pageOf([ORDER], 2, 3));
    await settle();
    (el.querySelector('button[aria-label="Página 3"]') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve));
    expect(TestBed.inject(Router).url).toBe('/proveedor/pedidos?page=3');
    http.expectOne((r) => r.params.get('page') === '3').flush(pageOf([ORDER], 3, 3));
    await settle();
  });

  it('sin conexión muestra el error con Reintentar y reintenta', async () => {
    const { el, settle, http, harness } = await setup();
    http.expectOne((r) => r.url === '/api/orders/provider/sub-orders').error(new ProgressEvent('e'));
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
    (
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Reintentar'),
      ) as HTMLButtonElement
    ).click();
    harness.detectChanges();
    http.expectOne((r) => r.url === '/api/orders/provider/sub-orders').flush(pageOf([ORDER]));
    await settle();
    expect(el.querySelector('tbody tr')).not.toBeNull();
  });
});
