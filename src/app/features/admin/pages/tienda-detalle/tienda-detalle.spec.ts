import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { StoreDetail } from '../../../../core/catalog';
import { TiendaDetalle } from './tienda-detalle';

const ID = 'abcdefabcdefabcdefabcdef';
const URL = `/api/catalog/admin/stores/${ID}`;

function store(overrides: Partial<StoreDetail> = {}): StoreDetail {
  return {
    id: ID,
    nombre: 'Agro Sur',
    nit: '900123',
    ownerId: 'owner1',
    municipio: 'Pasto',
    activa: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

async function setup(url = `/admin/tiendas/${ID}`) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/tiendas/:id', component: TiendaDetalle }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async (ms = 0) => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, ms));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, settle, http };
}

const text = (el: ParentNode) => el.textContent?.replace(/\s+/g, ' ') ?? '';
const button = (root: ParentNode, label: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const dialog = () => document.querySelector('mat-dialog-container') as HTMLElement | null;

describe('TiendaDetalle', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  it('muestra el estado, el formulario con los datos y los enlaces', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store());
    await settle();
    expect(text(el)).toContain('Activa');
    expect([...el.querySelectorAll('input')].map((i) => i.value)).toEqual([
      'Agro Sur',
      '900123',
      'Pasto',
    ]);
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/admin/usuarios/owner1');
    expect(hrefs).toContain(`/catalogo/tiendas/${ID}`);
  });

  it('en una tienda inactiva el botón de desactivar nace deshabilitado con la explicación', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store({ activa: false }));
    await settle();
    expect(text(el)).toContain('Inactiva');
    expect(button(el, 'Desactivar tienda').disabled).toBe(true);
    expect(text(el)).toContain('Una tienda desactivada no se reactiva');
  });

  it('Desactivar abre un diálogo que avisa que no se reactiva y Cancelar no envía nada', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store());
    await settle();
    button(el, 'Desactivar tienda').click();
    await settle(50);
    expect(text(dialog()!)).toContain('no se reactiva');
    button(dialog()!, 'Cancelar').click();
    await settle(300);
    http.expectNone(`${URL}/deactivate`);
  });

  it('confirmar desactiva la tienda y deja el botón deshabilitado', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store());
    await settle();
    button(el, 'Desactivar tienda').click();
    await settle(50);
    button(dialog()!, 'Desactivar tienda').click();
    const req = http.expectOne(`${URL}/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush(store({ activa: false }));
    await settle(300);
    expect(text(el)).toContain('Tienda desactivada.');
    expect(text(el)).toContain('Inactiva');
    expect(button(el, 'Desactivar tienda').disabled).toBe(true);
  });

  it('un error al desactivar se muestra y la tienda sigue activa', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store());
    await settle();
    button(el, 'Desactivar tienda').click();
    await settle(50);
    button(dialog()!, 'Desactivar tienda').click();
    http
      .expectOne(`${URL}/deactivate`)
      .flush({ statusCode: 500, message: 'Fallo interno' }, { status: 500, statusText: 'Error' });
    await settle(300);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Fallo interno');
    expect(button(el, 'Desactivar tienda').disabled).toBe(false);
  });

  it('guardar cambios actualiza la tienda mostrada', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(URL).flush(store());
    await settle();
    const input = el.querySelectorAll('input')[2] as HTMLInputElement;
    input.value = 'Ipiales';
    input.dispatchEvent(new Event('input'));
    await settle();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    req.flush(store({ municipio: 'Ipiales' }));
    await settle();
    expect(text(el)).toContain('Cambios guardados.');
  });

  it('un id con formato inválido muestra «Tienda no encontrada» sin pedir nada', async () => {
    const { el, settle } = await setup('/admin/tiendas/abc');
    await settle();
    expect(text(el)).toContain('Tienda no encontrada');
    expect(el.querySelector('a[href="/admin/tiendas"]')).not.toBeNull();
  });

  it('un 404 muestra «Tienda no encontrada»', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(el)).toContain('Tienda no encontrada');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(URL)
      .flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(text(el)).toContain('No se pudo conectar con el servidor');
    expect(button(el, 'Reintentar')).toBeTruthy();
  });
});
