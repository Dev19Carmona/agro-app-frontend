import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MyProduct, MyStore, MyVariant } from '../../models/proveedor.types';
import { MisProductos } from './mis-productos';

const CAT = '507f1f77bcf86cd799439021';
const STORE: MyStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: '507f1f77bcf86cd799439012',
  municipio: 'Bello',
  activa: true,
  createdAt: '2026-11-08T10:00:00.000Z',
};

function variant(patch: Partial<MyVariant> = {}): MyVariant {
  return {
    id: 'v1',
    productId: 'p1',
    presentacion: 'Bulto',
    unidad: '50kg',
    precio: 90000,
    precioVigente: 90000,
    stock: 20,
    stockReservado: 5,
    disponible: 15,
    activo: true,
    ...patch,
  };
}

function product(patch: Partial<MyProduct> = {}): MyProduct {
  return {
    id: '507f1f77bcf86cd799439031',
    storeId: STORE.id,
    categoryId: CAT,
    nombre: 'Abono orgánico',
    marca: 'Agro',
    fichaTecnica: {},
    requiresQuote: false,
    activo: true,
    variantes: [variant()],
    ...patch,
  };
}

function productsPage(data: MyProduct[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/proveedor/productos') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proveedor/productos', component: MisProductos }]),
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
  const respond = async (
    opts: { store?: MyStore | 'none'; products?: unknown; productsFail?: boolean } = {},
  ) => {
    const store = opts.store ?? STORE;
    const storeReq = http.expectOne('/api/catalog/my-store');
    if (store === 'none') {
      storeReq.flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    } else {
      storeReq.flush(store);
    }
    const productsReq = http.expectOne((r) => r.url === '/api/catalog/my-store/products');
    if (store === 'none') {
      productsReq.flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    } else if (opts.productsFail) {
      productsReq.error(new ProgressEvent('error'));
    } else {
      productsReq.flush(opts.products ?? productsPage([product()]));
    }
    http
      .expectOne('/api/catalog/categories')
      .flush([{ id: CAT, nombre: 'Fertilizantes' }]);
    await settle();
  };
  return { el, settle, respond, http, harness };
}

describe('MisProductos', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista activos e inactivos con estado, categoría, presentaciones y stock', async () => {
    const { el, respond } = await setup();
    await respond({
      products: productsPage([
        product(),
        product({
          id: '507f1f77bcf86cd799439032',
          nombre: 'Semilla de maíz',
          activo: false,
          variantes: [variant(), variant({ id: 'v2', stock: 8, stockReservado: 0, disponible: 8 })],
        }),
      ]),
    });
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) =>
      r.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Abono orgánico');
    expect(rows[0]).toContain('Fertilizantes');
    expect(rows[0]).toContain('Activo');
    expect(rows[0]).toContain('1 presentación');
    expect(rows[0]).toContain('15 disponibles');
    expect(rows[1]).toContain('Inactivo');
    expect(rows[1]).toContain('2 presentaciones');
    expect(rows[1]).toContain('23 disponibles');
    expect(el.textContent).toContain('2 productos');
  });

  it('el stock disponible ignora las presentaciones inactivas', async () => {
    const { el, respond } = await setup();
    await respond({
      products: productsPage([
        product({ variantes: [variant(), variant({ id: 'v2', disponible: 100, activo: false })] }),
      ]),
    });
    expect(el.querySelector('tbody')?.textContent).toContain('15 disponibles');
  });

  it('cada fila enlaza a la edición del producto', async () => {
    const { el, respond } = await setup();
    await respond();
    const link = el.querySelector('tbody a[href="/proveedor/productos/507f1f77bcf86cd799439031"]');
    expect(link?.getAttribute('aria-label')).toBe('Editar Abono orgánico');
  });

  it('pide la página de ?page= y la pagina con la URL', async () => {
    const { el, http, settle, harness } = await setup('/proveedor/productos?page=2');
    const storeReq = http.expectOne('/api/catalog/my-store');
    const productsReq = http.expectOne((r) => r.url === '/api/catalog/my-store/products');
    expect(productsReq.request.params.get('page')).toBe('2');
    expect(productsReq.request.params.get('limit')).toBe('10');
    storeReq.flush(STORE);
    productsReq.flush(productsPage([product()], 2, 3));
    http.expectOne('/api/catalog/categories').flush([]);
    await settle();

    const next = el.querySelector('button[aria-label="Página 3"]') as HTMLButtonElement;
    next.click();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/proveedor/productos?page=3');
    http.expectOne((r) => r.params.get('page') === '3').flush(productsPage([product()], 3, 3));
    await settle();
  });

  it('sin productos muestra el estado vacío con enlace a crear el primero', async () => {
    const { el, respond } = await setup();
    await respond({ products: productsPage([]) });
    expect(el.textContent).toContain('Aún no tienes productos');
    expect(el.querySelector('a[href="/proveedor/productos/nuevo"]')).not.toBeNull();
  });

  it('sin tienda muestra «Aún no tienes una tienda» con enlace a crearla', async () => {
    const { el, respond } = await setup();
    await respond({ store: 'none' });
    expect(el.textContent).toContain('Aún no tienes una tienda');
    expect(el.querySelector('a[href="/proveedor/tienda"]')).not.toBeNull();
    expect(el.querySelector('a[href="/proveedor/productos/nuevo"]')).toBeNull();
  });

  it('con la tienda desactivada, Nuevo producto va deshabilitado y hay aviso', async () => {
    const { el, respond } = await setup();
    await respond({ store: { ...STORE, activa: false } });
    expect(el.textContent).toContain('Tienda desactivada');
    expect(el.querySelector('a[href="/proveedor/productos/nuevo"]')).toBeNull();
    const button = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nuevo producto'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('con la tienda activa, Nuevo producto es un enlace', async () => {
    const { el, respond } = await setup();
    await respond();
    expect(
      el.querySelector('app-page-header a[href="/proveedor/productos/nuevo"]'),
    ).not.toBeNull();
  });

  it('sin conexión muestra el error con Reintentar', async () => {
    const { el, respond } = await setup();
    await respond({ productsFail: true });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
    expect(
      Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Reintentar')),
    ).toBe(true);
  });
});
