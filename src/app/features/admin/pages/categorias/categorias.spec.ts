import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminCategory } from '../../models/admin.types';
import { Categorias } from './categorias';

const CATS: AdminCategory[] = [
  { id: 'c1', nombre: 'Granos', activa: true },
  { id: 'c2', nombre: 'Lácteos', activa: false },
];

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/categorias', component: Categorias }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/categorias');
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const wait = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    harness.detectChanges();
  };
  return { el, settle, wait, http };
}

const rows = (el: HTMLElement) =>
  [...el.querySelectorAll('tbody tr')].map((r) => r.textContent?.replace(/\s+/g, ' ') ?? '');
const checkboxes = (el: HTMLElement) =>
  [...el.querySelectorAll('tbody input[type="checkbox"]')] as HTMLInputElement[];

describe('Categorias', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista categorías activas e inactivas', async () => {
    const { el, settle, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    const list = rows(el);
    expect(list.length).toBe(2);
    expect(list[0]).toContain('Granos');
    expect(list[1]).toContain('Lácteos');
    expect(checkboxes(el).map((c) => c.checked)).toEqual([true, false]);
  });

  it('una categoría desactivada sigue visible y se puede reactivar', async () => {
    const { el, settle, wait, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    checkboxes(el)[1].click();
    await wait();
    const req = http.expectOne('/api/catalog/categories/c2');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activa: true });
    req.flush({ ...CATS[1], activa: true });
    await settle();
    expect(checkboxes(el).map((c) => c.checked)).toEqual([true, true]);
    expect(el.textContent).toContain('«Lácteos» activada');
  });

  it('desactivar actualiza la fila con la respuesta, sin recargar', async () => {
    const { el, settle, wait, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    checkboxes(el)[0].click();
    await wait();
    http.expectOne('/api/catalog/categories/c1').flush({ ...CATS[0], activa: false });
    await settle();
    expect(checkboxes(el).map((c) => c.checked)).toEqual([false, false]);
    expect(el.textContent).toContain('«Granos» desactivada');
  });

  it('un error al activar muestra el mensaje y la casilla vuelve a su estado', async () => {
    const { el, settle, wait, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    checkboxes(el)[0].click();
    await wait();
    http
      .expectOne('/api/catalog/categories/c1')
      .flush({ statusCode: 500, message: 'Fallo interno' }, { status: 500, statusText: 'Error' });
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Fallo interno');
    expect(checkboxes(el)[0].checked).toBe(true);
  });

  it('Renombrar muestra el formulario en la fila', async () => {
    const { el, settle, wait, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    const rename = el.querySelector('button[aria-label="Renombrar Granos"]') as HTMLButtonElement;
    rename.click();
    await wait();
    const input = el.querySelector('tbody input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('Granos');
  });

  it('crear una categoría la agrega a la lista', async () => {
    const { el, settle, wait, http } = await setup();
    http.expectOne('/api/catalog/admin/categories').flush(CATS);
    await settle();
    const input = el.querySelector('app-card input') as HTMLInputElement;
    input.value = 'Frutas';
    input.dispatchEvent(new Event('input'));
    await wait();
    el.querySelector('app-card form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await wait();
    http.expectOne('/api/catalog/categories').flush({ id: 'c3', nombre: 'Frutas', activa: true });
    await settle();
    expect(rows(el).length).toBe(3);
    expect(el.textContent).toContain('Categoría «Frutas» creada');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne('/api/catalog/admin/categories')
      .flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
  });
});
