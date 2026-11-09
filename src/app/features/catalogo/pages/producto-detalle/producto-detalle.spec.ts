import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProductDetail, PublicStore } from '../../../../core/catalog';
import { AuthUser, SessionService } from '../../../../core/auth';
import { ProductoDetalle } from './producto-detalle';

const ID = '507f1f77bcf86cd799439011';
const STORE_ID = '507f1f77bcf86cd799439012';
const STORE: PublicStore = { id: STORE_ID, nombre: 'Tienda Verde', municipio: 'Rionegro' };
const USER: AuthUser = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana',
  rol: 'PRODUCTOR',
  status: 'ACTIVE',
};

function detail(patch: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: ID,
    storeId: STORE_ID,
    categoryId: '507f1f77bcf86cd799439013',
    nombre: 'Abono orgánico',
    marca: 'AgroVida',
    fichaTecnica: { Composición: 'Humus', Peso: '50 kg' },
    requiresQuote: false,
    activo: true,
    variantes: [
      {
        id: 'v1',
        productId: ID,
        presentacion: 'Bulto 50 kg',
        unidad: 'kg',
        precio: 30000,
        precioOferta: 25000,
        precioVigente: 25000,
        disponible: 4,
      },
      {
        id: 'v2',
        productId: ID,
        presentacion: 'Bulto 25 kg',
        unidad: 'kg',
        precio: 16000,
        precioVigente: 16000,
        disponible: 0,
      },
    ],
    ...patch,
  };
}

describe('ProductoDetalle', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'catalogo/productos/:id', component: ProductoDetalle }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.match(() => true));

  const root = () => harness.routeNativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function open(id: string) {
    await harness.navigateByUrl(`/catalogo/productos/${id}`, ProductoDetalle);
    harness.detectChanges();
  }
  /** Responde el producto y la tienda (que se pide cuando llega el producto). */
  async function load(product: ProductDetail, store: PublicStore | null = STORE) {
    http.expectOne(`/api/catalog/products/${ID}`).flush(product);
    // La tienda se pide al llegar el producto; con esa petición en vuelo la fixture no se estabiliza.
    const storeReq = await vi.waitFor(() =>
      http.expectOne(`/api/catalog/stores/${product.storeId}`),
    );
    if (store) {
      storeReq.flush(store);
    } else {
      storeReq.flush('Error', { status: 500, statusText: 'Server Error' });
    }
    await settle();
  }

  it('muestra el producto, la ficha técnica y las presentaciones', async () => {
    await open(ID);
    await load(detail());
    const content = text();
    expect(content).toContain('Abono orgánico');
    expect(content).toContain('AgroVida');
    expect(content).toContain('Ficha técnica');
    expect(content).toContain('Composición');
    expect(content).toContain('Humus');
    expect(content).toContain('Bulto 50 kg');
  });

  it('muestra el precio vigente, el anterior tachado y "Sin stock"', async () => {
    await open(ID);
    await load(detail());
    expect(text()).toContain('$ 25.000');
    expect(root().querySelector('s')?.textContent).toContain('$ 30.000');
    expect(text()).toContain('Sin stock');
    expect(text()).toContain('$ 16.000');
  });

  it('enlaza la tienda con su nombre', async () => {
    await open(ID);
    await load(detail());
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Tienda Verde'),
    );
    expect(link?.getAttribute('href')).toBe(`/catalogo/tiendas/${STORE_ID}`);
  });

  it('si falla la consulta de la tienda queda el enlace "Ver tienda"', async () => {
    await open(ID);
    await load(detail(), null);
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Ver tienda'),
    );
    expect(link?.getAttribute('href')).toBe(`/catalogo/tiendas/${STORE_ID}`);
    expect(text()).toContain('Abono orgánico');
  });

  it('el visitante ve "Inicia sesión para comprar" con enlace al login y returnUrl', async () => {
    await open(ID);
    await load(detail());
    expect(text()).toContain('Inicia sesión para comprar');
    const login = [...root().querySelectorAll('a')].find((a) =>
      a.getAttribute('href')?.startsWith('/auth/login'),
    );
    expect(login?.getAttribute('href')).toBe(
      `/auth/login?returnUrl=${encodeURIComponent(`/catalogo/productos/${ID}`)}`,
    );
  });

  it('con sesión no se muestra el aviso', async () => {
    TestBed.inject(SessionService).start({ accessToken: 'a', refreshToken: 'r' }, USER);
    await open(ID);
    http.expectOne('/api/orders/cart').flush({ items: [], total: 0 });
    await load(detail());
    expect(text()).not.toContain('Inicia sesión para comprar');
  });

  it('el visitante no ve cantidad ni "Agregar al carrito"', async () => {
    await open(ID);
    await load(detail());
    expect(text()).not.toContain('Agregar al carrito');
    expect(root().querySelector('input[type="number"]')).toBeNull();
  });

  describe('como PRODUCTOR', () => {
    const addButtons = () =>
      [...root().querySelectorAll('button')].filter((b) =>
        b.textContent?.includes('Agregar al carrito'),
      );
    const cartLine = (variantId: string, cantidad: number) => ({
      variantId,
      cantidad,
      disponible: 4,
      apta: true,
    });

    async function openAsBuyer(
      product: ProductDetail = detail(),
      items: ReturnType<typeof cartLine>[] = [],
    ) {
      TestBed.inject(SessionService).start({ accessToken: 'a', refreshToken: 'r' }, USER);
      await open(ID);
      http.expectOne('/api/orders/cart').flush({ items, total: 0 });
      await load(product);
    }

    /** Pulsa Agregar y responde el PUT y la recarga del carrito. */
    async function addAndReply(finalQuantity: number, cartAfter: ReturnType<typeof cartLine>[]) {
      addButtons()[0].click();
      const put = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v1'));
      expect(put.request.body).toEqual({ cantidad: finalQuantity });
      put.flush({ variantId: 'v1', cantidad: finalQuantity });
      const reload = await vi.waitFor(() => http.expectOne('/api/orders/cart'));
      reload.flush({ items: cartAfter, total: 0 });
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(text()).toContain('Agregado al carrito');
      });
    }

    it('ve cantidad y "Agregar al carrito" solo en presentaciones con stock', async () => {
      await openAsBuyer();
      expect(addButtons().length).toBe(1);
      expect(root().querySelectorAll('input[type="number"]').length).toBe(1);
    });

    it('un producto a cotizar no ofrece compra', async () => {
      await openAsBuyer(detail({ requiresQuote: true }));
      expect(addButtons().length).toBe(0);
    });

    it('agregar una presentación nueva envía la cantidad pedida y lo anuncia', async () => {
      await openAsBuyer();
      await addAndReply(1, [cartLine('v1', 1)]);
      expect(text()).toContain('Agregado al carrito');
      expect(root().querySelector('a[href="/carrito"]')).not.toBeNull();
    });

    it('agregarla otra vez suma a la cantidad existente', async () => {
      await openAsBuyer(detail(), [cartLine('v1', 2)]);
      await addAndReply(3, [cartLine('v1', 3)]);
      expect(text()).toContain('3 en total');
    });

    it('si pasa de 1000 queda en 1000 con un aviso', async () => {
      await openAsBuyer(detail(), [cartLine('v1', 1000)]);
      await addAndReply(1000, [cartLine('v1', 1000)]);
      expect(text()).toContain('se limitó a 1000');
    });

    it('pedir más que la disponibilidad avisa y aun así agrega', async () => {
      await openAsBuyer(detail(), [cartLine('v1', 4)]);
      await addAndReply(5, [cartLine('v1', 5)]);
      expect(text()).toContain('Supera la disponibilidad actual');
    });

    it('un error del backend se muestra en un aviso de error', async () => {
      await openAsBuyer();
      addButtons()[0].click();
      const put = await vi.waitFor(() => http.expectOne('/api/orders/cart/items/v1'));
      put.flush({ message: 'Máximo 50 líneas' }, { status: 400, statusText: 'Bad Request' });
      await settle();
      expect(text()).toContain('Máximo 50 líneas');
      expect(root().querySelector('[role="alert"]')).not.toBeNull();
    });

    it('con 50 líneas avisa antes de intentar agregar otra presentación', async () => {
      const lines = Array.from({ length: 50 }, (_, i) => cartLine(`x${i}`, 1));
      await openAsBuyer(detail(), lines);
      addButtons()[0].click();
      await settle();
      expect(text()).toContain('El carrito ya tiene 50 líneas');
      http.expectNone('/api/orders/cart/items/v1');
    });
  });

  it('un producto a cotizar muestra "Precio a cotizar", sin precios y sin aviso de compra', async () => {
    await open(ID);
    await load(detail({ requiresQuote: true }));
    expect(text()).toContain('Precio a cotizar');
    expect(text()).toContain('A cotizar');
    expect(text()).not.toContain('$');
    expect(text()).not.toContain('Inicia sesión para comprar');
  });

  it('un producto sin presentaciones lo dice', async () => {
    await open(ID);
    await load(detail({ variantes: [] }));
    expect(text()).toContain('aún no tiene presentaciones');
  });

  it('un 404 muestra "Producto no encontrado" con enlace al catálogo', async () => {
    await open(ID);
    http
      .expectOne(`/api/catalog/products/${ID}`)
      .flush(
        { statusCode: 404, message: 'Producto no encontrado', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();
    expect(text()).toContain('Producto no encontrado');
    const link = [...root().querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Ver el catálogo'),
    );
    expect(link?.getAttribute('href')).toBe('/catalogo');
  });

  it('un id con formato inválido muestra "Producto no encontrado" sin pedir nada', async () => {
    await open('xyz');
    expect(text()).toContain('Producto no encontrado');
    http.expectNone((r) => r.url.startsWith('/api/catalog/products'));
  });

  it('un error de red muestra el mensaje y Reintentar pide el producto otra vez', async () => {
    await open(ID);
    http.expectOne(`/api/catalog/products/${ID}`).error(new ProgressEvent('error'));
    await settle();
    expect(text()).toContain('No se pudo conectar con el servidor');
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
    [...root().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))
      ?.click();
    const again = await vi.waitFor(() => http.expectOne(`/api/catalog/products/${ID}`));
    again.flush(detail());
  });

  it('mientras carga muestra el estado de carga con aria-busy', async () => {
    await open(ID);
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
