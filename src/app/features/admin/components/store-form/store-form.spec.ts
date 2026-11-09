import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { StoreDetail } from '../../../../core/catalog';
import { AdminStoreForm } from './store-form';

const STORE: StoreDetail = {
  id: 'abcdefabcdefabcdefabcdef',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: 'o1',
  municipio: 'Pasto',
  activa: true,
  createdAt: '2026-11-01T10:00:00.000Z',
};

@Component({
  imports: [AdminStoreForm],
  template: `<app-admin-store-form [store]="store" (saved)="saved.push($event)" />`,
})
class Host {
  store = STORE;
  saved: StoreDetail[] = [];
}

async function settle(f: ComponentFixture<Host>) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  f.detectChanges();
}

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(Host);
  f.detectChanges();
  return { f, http: TestBed.inject(HttpTestingController), el: f.nativeElement as HTMLElement };
}

function type(el: HTMLElement, index: number, value: string) {
  const input = el.querySelectorAll('input')[index] as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

const submit = (el: HTMLElement) =>
  el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
const URL = `/api/catalog/admin/stores/${STORE.id}`;

describe('AdminStoreForm', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('parte con los datos de la tienda', () => {
    const { el } = setup();
    const values = [...el.querySelectorAll('input')].map((i) => i.value);
    expect(values).toEqual(['Agro Sur', '900123', 'Pasto']);
  });

  it('envía solo los campos que cambiaron', async () => {
    const { f, http, el } = setup();
    type(el, 2, ' Ipiales ');
    submit(el);
    await settle(f);
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ municipio: 'Ipiales' });
    req.flush({ ...STORE, municipio: 'Ipiales' });
    await settle(f);
    expect(f.componentInstance.saved[0].municipio).toBe('Ipiales');
  });

  it('sin cambios no envía nada y lo explica', async () => {
    const { f, http, el } = setup();
    submit(el);
    await settle(f);
    http.expectNone(URL);
    expect(el.textContent).toContain('Cambia al menos un campo');
  });

  it('un campo vacío no se envía', async () => {
    const { f, http, el } = setup();
    type(el, 0, '   ');
    submit(el);
    await settle(f);
    http.expectNone(URL);
    expect(el.textContent).toContain('Escribe');
  });

  it('un error del backend se muestra y conserva lo escrito', async () => {
    const { f, http, el } = setup();
    type(el, 1, '555');
    submit(el);
    await settle(f);
    http
      .expectOne(URL)
      .flush(
        { statusCode: 409, message: 'El NIT ya está registrado', error: 'Conflict' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(f);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('El NIT ya está registrado');
    expect((el.querySelectorAll('input')[1] as HTMLInputElement).value).toBe('555');
    expect(f.componentInstance.saved).toEqual([]);
  });
});
