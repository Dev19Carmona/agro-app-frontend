import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionRefresher } from '../../../../core/auth';
import { MyStore } from '../../models/proveedor.types';
import { MiTienda } from './mi-tienda';

const STORE: MyStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: '507f1f77bcf86cd799439012',
  municipio: 'Bello',
  activa: true,
  createdAt: '2026-11-08T10:00:00.000Z',
};

function setup(refresh: () => Promise<void> = () => Promise.resolve()) {
  const refresher = { refresh: vi.fn(refresh) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SessionRefresher, useValue: refresher },
    ],
  });
  const fixture = TestBed.createComponent(MiTienda);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, settle, refresher, http: TestBed.inject(HttpTestingController) };
}

describe('MiTienda', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('mientras carga muestra el estado de carga', () => {
    const { el, http } = setup();
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
    http.expectOne('/api/catalog/my-store');
  });

  it('con tienda muestra la ficha y el enlace a su página pública', async () => {
    const { el, settle, http } = setup();
    http.expectOne('/api/catalog/my-store').flush(STORE);
    await settle();
    expect(el.textContent).toContain('Agro Sur');
    expect(el.textContent).toContain('900123');
    expect(el.textContent).toContain('Bello');
    expect(el.querySelector(`a[href="/catalogo/tiendas/${STORE.id}"]`)).not.toBeNull();
    expect(el.querySelector('app-store-form')).toBeNull();
  });

  it('con la tienda desactivada avisa y no ofrece la página pública', async () => {
    const { el, settle, http } = setup();
    http.expectOne('/api/catalog/my-store').flush({ ...STORE, activa: false });
    await settle();
    expect(el.textContent).toContain('Tienda desactivada');
    expect(el.textContent).toContain('no aparece en el catálogo');
    expect(el.querySelector('a[href^="/catalogo/tiendas/"]')).toBeNull();
  });

  it('un 404 muestra el formulario de creación', async () => {
    const { el, settle, http } = setup();
    http
      .expectOne('/api/catalog/my-store')
      .flush({ statusCode: 404, message: 'Tienda no encontrada' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(el.querySelector('app-store-form')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('otro error muestra el mensaje con Reintentar y reintenta', async () => {
    const { fixture, el, settle, http } = setup();
    http.expectOne('/api/catalog/my-store').error(new ProgressEvent('error'));
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
    const retry = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    http.expectOne('/api/catalog/my-store').flush(STORE);
    await settle();
    expect(el.textContent).toContain('Agro Sur');
  });

  async function createStore(refresh?: () => Promise<void>) {
    const ctx = setup(refresh);
    ctx.http
      .expectOne('/api/catalog/my-store')
      .flush({ statusCode: 404, message: 'x' }, { status: 404, statusText: 'Not Found' });
    await ctx.settle();
    const inputs = Array.from(ctx.el.querySelectorAll('input'));
    ['Agro Sur', '900123', 'Bello'].forEach((text, i) => {
      inputs[i].value = text;
      inputs[i].dispatchEvent(new Event('input'));
    });
    await ctx.settle();
    (ctx.el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await ctx.settle();
    ctx.http.expectOne('/api/catalog/stores').flush(STORE);
    await ctx.settle();
    return ctx;
  }

  it('al crear la tienda muestra la ficha y renueva la sesión', async () => {
    const { el, refresher } = await createStore();
    expect(el.querySelector('app-store-form')).toBeNull();
    expect(el.textContent).toContain('Agro Sur');
    expect(el.textContent).toContain('se creó correctamente');
    expect(refresher.refresh).toHaveBeenCalledTimes(1);
    expect(el.textContent).not.toContain('Vuelve a iniciar sesión');
  });

  it('si el refresh falla, la tienda sigue visible y avisa que hay que volver a iniciar sesión', async () => {
    const { el } = await createStore(() => Promise.reject({ status: 0, message: 'sin red' }));
    expect(el.textContent).toContain('Agro Sur');
    expect(el.textContent).toContain(
      'Tu tienda se creó, pero no se pudo actualizar la sesión. Vuelve a iniciar sesión para ver tus pedidos',
    );
  });
});
