import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MyProduct, MyStore, MyVariant } from '../../models/proveedor.types';
import { ProductoEditar } from './producto-editar';

const ID = '507f1f77bcf86cd799439031';
const OTHER = '507f1f77bcf86cd799439032';
const STORE: MyStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: '507f1f77bcf86cd799439012',
  municipio: 'Bello',
  activa: true,
  createdAt: '2026-11-08T10:00:00.000Z',
};
const VARIANT: MyVariant = {
  id: '507f1f77bcf86cd799439041',
  productId: ID,
  presentacion: 'Bulto',
  unidad: '50 kg',
  precio: 90000,
  precioVigente: 90000,
  stock: 20,
  stockReservado: 5,
  disponible: 15,
  activo: true,
};
const PRODUCT: MyProduct = {
  id: ID,
  storeId: STORE.id,
  categoryId: 'c1',
  nombre: 'Abono orgánico',
  marca: 'Agro',
  fichaTecnica: { Peso: '50 kg' },
  requiresQuote: false,
  activo: true,
  variantes: [VARIANT],
};

function productsPage(data: MyProduct[]) {
  return { data, page: 1, limit: 100, total: data.length, totalPages: 1 };
}

async function setup(id = ID) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proveedor/productos/:id', component: ProductoEditar }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/proveedor/productos/${id}`);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const respond = async (opts: { store?: MyStore | 'none'; products?: MyProduct[] } = {}) => {
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
    } else {
      productsReq.flush(productsPage(opts.products ?? [PRODUCT]));
    }
    http.expectOne('/api/catalog/categories').flush([{ id: 'c1', nombre: 'Fertilizantes' }]);
    await settle();
  };
  return { el, settle, respond, http };
}

describe('ProductoEditar', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
  });

  it('muestra el producto, su formulario y una fila por presentación', async () => {
    const { el, respond } = await setup();
    await respond();
    expect(el.querySelector('h1')?.textContent).toContain('Editar producto');
    expect(el.textContent).toContain('Abono orgánico');
    expect(el.querySelector('app-product-form')).not.toBeNull();
    expect(el.querySelectorAll('app-variant-editor')).toHaveLength(1);
    expect(el.querySelector('app-variant-create-form')).not.toBeNull();
  });

  it('un producto sin presentaciones invita a agregar la primera', async () => {
    const { el, respond } = await setup();
    await respond({ products: [{ ...PRODUCT, variantes: [] }] });
    expect(el.textContent).toContain('aún no tiene presentaciones');
    expect(el.querySelectorAll('app-variant-editor')).toHaveLength(0);
  });

  it('un producto que no está en la lista muestra «Producto no encontrado»', async () => {
    const { el, respond } = await setup();
    await respond({ products: [{ ...PRODUCT, id: OTHER }] });
    expect(el.textContent).toContain('Producto no encontrado');
    expect(el.querySelector('a[href="/proveedor/productos"]')).not.toBeNull();
  });

  it('un id con formato inválido muestra «Producto no encontrado» sin pedir productos', async () => {
    const { el, settle, http } = await setup('abc');
    http.expectOne('/api/catalog/my-store').flush(STORE);
    http.expectOne('/api/catalog/categories').flush([]);
    await settle();
    http.expectNone((r) => r.url === '/api/catalog/my-store/products');
    expect(el.textContent).toContain('Producto no encontrado');
  });

  it('sin tienda muestra «Aún no tienes una tienda» con enlace a crearla', async () => {
    const { el, respond } = await setup();
    await respond({ store: 'none' });
    expect(el.textContent).toContain('Aún no tienes una tienda');
    expect(el.textContent).not.toContain('Producto no encontrado');
    expect(el.querySelector('a[href="/proveedor/tienda"]')).not.toBeNull();
  });

  it('guardar el stock de una presentación actualiza solo esa fila con la respuesta', async () => {
    const { el, respond, settle, http } = await setup();
    await respond({
      products: [{ ...PRODUCT, variantes: [VARIANT, { ...VARIANT, id: 'v2', presentacion: 'Saco' }] }],
    });
    const editor = el.querySelectorAll('app-variant-editor')[0];
    const field = Array.from(editor.querySelectorAll('mat-form-field'))
      .find((f) => f.querySelector('label')?.textContent?.includes('Stock total'))
      ?.querySelector('input') as HTMLInputElement;
    field.value = '40';
    field.dispatchEvent(new Event('input'));
    await settle();
    (
      Array.from(editor.querySelectorAll('button[type="submit"]')).find((b) =>
        b.textContent?.includes('Guardar stock'),
      ) as HTMLButtonElement
    ).click();
    await settle();
    http
      .expectOne(`/api/catalog/variants/${VARIANT.id}/stock`)
      .flush({ ...VARIANT, stock: 40, disponible: 35 });
    await settle();
    const first = el.querySelectorAll('app-variant-editor')[0].textContent?.replace(/\s+/g, ' ');
    expect(first).toContain('40');
    expect(first).toContain('35');
    const second = el.querySelectorAll('app-variant-editor')[1];
    expect(second.textContent).toContain('Saco');
    const values = Array.from(second.querySelectorAll('app-stock-summary dd')).map((d) =>
      d.textContent?.trim(),
    );
    expect(values).toEqual(['20', '5', '15']);
  });

  it('crear una presentación la agrega a la lista sin recargar', async () => {
    const { el, respond, settle, http } = await setup();
    await respond();
    const form = el.querySelector('app-variant-create-form') as HTMLElement;
    const set = async (label: string, value: string) => {
      const input = Array.from(form.querySelectorAll('mat-form-field'))
        .find((f) => f.querySelector('label')?.textContent?.includes(label))
        ?.querySelector('input') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle();
    };
    await set('Presentación', 'Saco');
    await set('Unidad', '25 kg');
    await set('Precio (COP)', '50000');
    await set('Stock inicial', '10');
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
    http.expectOne(`/api/catalog/products/${ID}/variants`).flush({
      ...VARIANT,
      id: 'nueva',
      presentacion: 'Saco',
      unidad: '25 kg',
      precio: 50000,
      precioVigente: 50000,
      stock: 10,
      stockReservado: 0,
      disponible: 10,
    });
    await settle();
    expect(el.querySelectorAll('app-variant-editor')).toHaveLength(2);
    expect(el.querySelectorAll('app-variant-editor')[1].textContent).toContain('Saco');
  });
});
