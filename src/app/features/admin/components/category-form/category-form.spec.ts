import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCategory } from '../../models/admin.types';
import { CategoryForm } from './category-form';

const CATEGORY: AdminCategory = { id: 'c1', nombre: 'Granos', activa: true };

@Component({
  imports: [CategoryForm],
  template: `<app-category-form
    [category]="category()"
    (saved)="saved.push($event)"
    (cancelled)="cancelled = cancelled + 1"
  />`,
})
class Host {
  category = signal<AdminCategory | null>(null);
  saved: AdminCategory[] = [];
  cancelled = 0;
}

async function settle(f: ComponentFixture<Host>) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  f.detectChanges();
}

function setup(category: AdminCategory | null = null) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(Host);
  f.componentInstance.category.set(category);
  f.detectChanges();
  return { f, http: TestBed.inject(HttpTestingController), el: f.nativeElement as HTMLElement };
}

function type(f: ComponentFixture<Host>, value: string) {
  const input = (f.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  f.detectChanges();
}

const submit = (el: HTMLElement) =>
  el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

describe('CategoryForm', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('crea una categoría con el nombre recortado y vacía el campo', async () => {
    const { f, http, el } = setup();
    type(f, '  Frutas  ');
    submit(el);
    await settle(f);
    const req = http.expectOne('/api/catalog/categories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Frutas' });
    req.flush({ id: 'c2', nombre: 'Frutas', activa: true });
    await settle(f);
    expect(f.componentInstance.saved).toEqual([{ id: 'c2', nombre: 'Frutas', activa: true }]);
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('un nombre vacío no se envía y muestra el error', async () => {
    const { f, http, el } = setup();
    type(f, '   ');
    submit(el);
    await settle(f);
    http.expectNone('/api/catalog/categories');
    expect(el.textContent).toContain('Escribe el nombre de la categoría');
  });

  it('un nombre de más de 100 caracteres no se envía', async () => {
    const { f, http, el } = setup();
    type(f, 'a'.repeat(101));
    submit(el);
    await settle(f);
    http.expectNone('/api/catalog/categories');
    expect(el.textContent).toContain('Máximo 100 caracteres');
  });

  it('un 409 se muestra junto al campo y conserva lo escrito', async () => {
    const { f, http, el } = setup();
    type(f, 'granos');
    submit(el);
    await settle(f);
    http
      .expectOne('/api/catalog/categories')
      .flush(
        { statusCode: 409, message: 'Ya existe una categoría con ese nombre', error: 'Conflict' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(f);
    expect(el.textContent).toContain('Ya existe una categoría con ese nombre');
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('granos');
    expect(f.componentInstance.saved).toEqual([]);
  });

  it('con una categoría la renombra por PATCH y ofrece Cancelar', async () => {
    const { f, http, el } = setup(CATEGORY);
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('Granos');
    type(f, 'Cereales');
    submit(el);
    await settle(f);
    const req = http.expectOne('/api/catalog/categories/c1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nombre: 'Cereales' });
    req.flush({ ...CATEGORY, nombre: 'Cereales' });
    await settle(f);
    expect(f.componentInstance.saved[0].nombre).toBe('Cereales');

    const cancel = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement;
    cancel.click();
    expect(f.componentInstance.cancelled).toBe(1);
  });

  it('otro error del backend se muestra en una alerta', async () => {
    const { f, http, el } = setup();
    type(f, 'Frutas');
    submit(el);
    await settle(f);
    http
      .expectOne('/api/catalog/categories')
      .flush({ statusCode: 500, message: 'Fallo interno' }, { status: 500, statusText: 'Error' });
    await settle(f);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Fallo interno');
  });
});
