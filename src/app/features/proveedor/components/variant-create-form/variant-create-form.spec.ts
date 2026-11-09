import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MyVariant } from '../../models/proveedor.types';
import { VariantCreateForm } from './variant-create-form';

const PRODUCT_ID = '507f1f77bcf86cd799439031';
const CREATED: MyVariant = {
  id: '507f1f77bcf86cd799439041',
  productId: PRODUCT_ID,
  presentacion: 'Bulto',
  unidad: 'kg',
  precio: 90000,
  precioVigente: 90000,
  stock: 5,
  stockReservado: 0,
  disponible: 5,
  activo: true,
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(VariantCreateForm);
  fixture.componentRef.setInput('productId', PRODUCT_ID);
  const created: MyVariant[] = [];
  fixture.componentInstance.created.subscribe((v) => created.push(v));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const input = (label: string) =>
    Array.from(el.querySelectorAll('mat-form-field'))
      .find((f) => f.querySelector('label')?.textContent?.includes(label))
      ?.querySelector('input') as HTMLInputElement;
  const type = async (label: string, value: string) => {
    const field = input(label);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await settle();
  };
  const fill = async (over: Record<string, string> = {}) => {
    const values: Record<string, string> = {
      Presentación: 'Bulto',
      Unidad: 'kg',
      'Precio (COP)': '90000',
      'Precio de oferta': '',
      'Stock inicial': '5',
      ...over,
    };
    for (const [label, value] of Object.entries(values)) {
      await type(label, value);
    }
  };
  const send = async () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  return {
    el,
    settle,
    input,
    fill,
    send,
    created,
    http: TestBed.inject(HttpTestingController),
  };
}

describe('VariantCreateForm', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('con todo vacío no envía y muestra los errores', async () => {
    const { el, send, http } = setup();
    await send();
    http.expectNone(`/api/catalog/products/${PRODUCT_ID}/variants`);
    const errors = Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(errors).toEqual([
      'Escribe la presentación',
      'Escribe la unidad',
      'Escribe el precio',
      'Escribe el stock',
    ]);
  });

  it('una oferta mayor o igual al precio no se envía', async () => {
    const { el, fill, send, http } = setup();
    await fill({ 'Precio de oferta': '90000' });
    await send();
    http.expectNone(`/api/catalog/products/${PRODUCT_ID}/variants`);
    expect(el.textContent).toContain('La oferta debe ser menor que el precio');
  });

  it('con datos válidos hace POST sin oferta, emite la presentación y vacía el formulario', async () => {
    const { input, fill, send, settle, created, el, http } = setup();
    await fill();
    await send();
    const req = http.expectOne(`/api/catalog/products/${PRODUCT_ID}/variants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      presentacion: 'Bulto',
      unidad: 'kg',
      precio: 90000,
      stock: 5,
    });
    req.flush(CREATED);
    await settle();
    expect(created).toEqual([CREATED]);
    expect(input('Presentación').value).toBe('');
    expect(el.textContent).toContain('Presentación agregada');
  });

  it('con oferta válida la envía', async () => {
    const { fill, send, http } = setup();
    await fill({ 'Precio de oferta': '80000' });
    await send();
    const req = http.expectOne(`/api/catalog/products/${PRODUCT_ID}/variants`);
    expect(req.request.body.precioOferta).toBe(80000);
    req.flush(CREATED);
  });

  it('un error del backend se muestra y conserva lo escrito', async () => {
    const { el, input, fill, send, settle, created, http } = setup();
    await fill();
    await send();
    http
      .expectOne(`/api/catalog/products/${PRODUCT_ID}/variants`)
      .flush({ statusCode: 409, message: 'La presentación ya existe' }, { status: 409, statusText: 'C' });
    await settle();
    expect(el.querySelector('app-alert')?.textContent).toContain('La presentación ya existe');
    expect(input('Presentación').value).toBe('Bulto');
    expect(created).toEqual([]);
  });
});
