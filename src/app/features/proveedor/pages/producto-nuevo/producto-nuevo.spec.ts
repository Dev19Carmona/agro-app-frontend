import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MyStore } from '../../models/proveedor.types';
import { ProductoNuevo } from './producto-nuevo';

const STORE: MyStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: '507f1f77bcf86cd799439012',
  municipio: 'Bello',
  activa: true,
  createdAt: '2026-11-08T10:00:00.000Z',
};

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proveedor/productos/nuevo', component: ProductoNuevo }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/proveedor/productos/nuevo');
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const respond = async (store: MyStore | 'none') => {
    const req = http.expectOne('/api/catalog/my-store');
    if (store === 'none') {
      req.flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    } else {
      req.flush(store);
    }
    http.expectOne('/api/catalog/categories').flush([{ id: 'c1', nombre: 'Fertilizantes' }]);
    await settle();
  };
  return { el, settle, respond, http };
}

describe('ProductoNuevo', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('con tienda activa muestra el formulario de producto', async () => {
    const { el, respond } = await setup();
    await respond(STORE);
    expect(el.querySelector('app-product-form')).not.toBeNull();
    expect(el.querySelector('h1')?.textContent).toContain('Nuevo producto');
  });

  it('sin tienda muestra «Aún no tienes una tienda» con enlace a crearla', async () => {
    const { el, respond } = await setup();
    await respond('none');
    expect(el.textContent).toContain('Aún no tienes una tienda');
    expect(el.querySelector('a[href="/proveedor/tienda"]')).not.toBeNull();
    expect(el.querySelector('app-product-form')).toBeNull();
  });

  it('con la tienda desactivada avisa y no muestra el formulario', async () => {
    const { el, respond } = await setup();
    await respond({ ...STORE, activa: false });
    expect(el.textContent).toContain('no admite productos nuevos');
    expect(el.querySelector('app-product-form')).toBeNull();
  });

  it('si fallan las categorías muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http.expectOne('/api/catalog/my-store').flush(STORE);
    http.expectOne('/api/catalog/categories').error(new ProgressEvent('error'));
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
  });
});
