import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MyVariant } from '../../models/proveedor.types';
import { VariantEditor } from './variant-editor';

const VARIANT: MyVariant = {
  id: '507f1f77bcf86cd799439041',
  productId: '507f1f77bcf86cd799439031',
  presentacion: 'Bulto',
  unidad: '50 kg',
  precio: 90000,
  precioOferta: 80000,
  precioVigente: 80000,
  stock: 20,
  stockReservado: 5,
  disponible: 15,
  activo: true,
};

function setup(variant: MyVariant = VARIANT) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(VariantEditor);
  fixture.componentRef.setInput('variant', variant);
  const changed: MyVariant[] = [];
  fixture.componentInstance.changed.subscribe((v) => changed.push(v));
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
  const submit = async (text: string) => {
    (
      Array.from(el.querySelectorAll('button[type="submit"]')).find((b) =>
        b.textContent?.includes(text),
      ) as HTMLButtonElement
    ).click();
    await settle();
  };
  return {
    fixture,
    el,
    settle,
    input,
    type,
    submit,
    changed,
    http: TestBed.inject(HttpTestingController),
  };
}

describe('VariantEditor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra presentación, precio vigente, estado, oferta y el stock total, reservado y disponible', () => {
    const { el } = setup();
    const text = el.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('Bulto · 50 kg');
    expect(text).toContain('Activa');
    expect(text).toContain('En oferta');
    expect(el.querySelector('s')?.textContent).toContain('90.000');
    const pairs = Array.from(el.querySelectorAll('app-stock-summary div')).map((d) =>
      d.querySelector('dd')?.textContent?.trim(),
    );
    expect(pairs).toEqual(['20', '5', '15']);
  });

  it('una presentación inactiva muestra el badge «Inactiva»', () => {
    const { el } = setup({ ...VARIANT, activo: false });
    expect(el.querySelector('app-badge')?.textContent).toContain('Inactiva');
  });

  it('carga los valores actuales en los formularios', () => {
    const { input } = setup();
    expect(input('Presentación').value).toBe('Bulto');
    expect(input('Unidad').value).toBe('50 kg');
    expect(input('Precio (COP)').value).toBe('90000');
    expect(input('Precio de oferta').value).toBe('80000');
    expect(input('Stock total').value).toBe('20');
  });

  describe('datos', () => {
    it('guardar envía PATCH a /variants/:id y emite la presentación devuelta', async () => {
      const { type, submit, settle, changed, http } = setup();
      await type('Precio (COP)', '95000');
      await submit('Guardar datos');
      const req = http.expectOne(`/api/catalog/variants/${VARIANT.id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        presentacion: 'Bulto',
        unidad: '50 kg',
        precio: 95000,
        precioOferta: 80000,
        activo: true,
      });
      const saved = { ...VARIANT, precio: 95000 };
      req.flush(saved);
      await settle();
      expect(changed).toEqual([saved]);
    });

    it('vaciar la oferta envía precioOferta: null y la presentación deja de mostrarla', async () => {
      const { fixture, el, type, submit, settle, changed, http } = setup();
      await type('Precio de oferta', '');
      await submit('Guardar datos');
      const req = http.expectOne(`/api/catalog/variants/${VARIANT.id}`);
      expect(req.request.body.precioOferta).toBeNull();
      const { precioOferta: _removed, ...sinOferta } = VARIANT;
      const saved: MyVariant = { ...sinOferta, precioVigente: 90000 };
      req.flush(saved);
      await settle();
      fixture.componentRef.setInput('variant', changed[0]);
      await settle();
      expect(el.textContent).not.toContain('En oferta');
    });

    it('«Quitar oferta» vacía el campo', async () => {
      const { el, input, settle } = setup();
      (
        Array.from(el.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Quitar oferta'),
        ) as HTMLButtonElement
      ).click();
      await settle();
      expect(input('Precio de oferta').value).toBe('');
    });

    it('una oferta mayor o igual al precio no se envía', async () => {
      const { el, type, submit, http } = setup();
      await type('Precio de oferta', '90000');
      await submit('Guardar datos');
      http.expectNone(`/api/catalog/variants/${VARIANT.id}`);
      expect(el.textContent).toContain('La oferta debe ser menor que el precio');
    });

    it('desactivar la presentación envía activo: false', async () => {
      const { el, submit, settle, http } = setup();
      (el.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
      await settle();
      await submit('Guardar datos');
      const req = http.expectOne(`/api/catalog/variants/${VARIANT.id}`);
      expect(req.request.body.activo).toBe(false);
      req.flush({ ...VARIANT, activo: false });
    });

    it('un error del backend se muestra y conserva lo escrito', async () => {
      const { el, type, input, submit, settle, http } = setup();
      await type('Precio (COP)', '95000');
      await submit('Guardar datos');
      http
        .expectOne(`/api/catalog/variants/${VARIANT.id}`)
        .flush({ statusCode: 400, message: 'Datos inválidos' }, { status: 400, statusText: 'Bad' });
      await settle();
      expect(el.querySelector('app-alert')?.textContent).toContain('Datos inválidos');
      expect(input('Precio (COP)').value).toBe('95000');
    });
  });

  describe('stock', () => {
    it('fijar el stock envía el valor absoluto y emite stock y disponible del backend', async () => {
      const { type, submit, settle, changed, http } = setup();
      await type('Stock total', '40');
      await submit('Guardar stock');
      const req = http.expectOne(`/api/catalog/variants/${VARIANT.id}/stock`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ stock: 40 });
      req.flush({ ...VARIANT, stock: 40, disponible: 35 });
      await settle();
      expect(changed[0].stock).toBe(40);
      expect(changed[0].disponible).toBe(35);
    });

    it('un valor por debajo de lo reservado no se envía', async () => {
      const { el, type, submit, http } = setup();
      await type('Stock total', '4');
      await submit('Guardar stock');
      http.expectNone(`/api/catalog/variants/${VARIANT.id}/stock`);
      expect(el.textContent).toContain('No puede ser menor que lo reservado (5)');
    });

    it('un 409 del backend muestra su mensaje', async () => {
      const { el, type, submit, settle, http } = setup();
      await type('Stock total', '6');
      await submit('Guardar stock');
      http
        .expectOne(`/api/catalog/variants/${VARIANT.id}/stock`)
        .flush(
          { statusCode: 409, message: 'El stock no puede ser menor que lo reservado' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();
      expect(el.querySelector('app-alert')?.textContent).toContain(
        'El stock no puede ser menor que lo reservado',
      );
    });

    it('un envío en curso deshabilita el botón', async () => {
      const { el, type, submit, http } = setup();
      await type('Stock total', '30');
      await submit('Guardar stock');
      const button = Array.from(el.querySelectorAll('button[type="submit"]')).find((b) =>
        b.textContent?.includes('Guardando'),
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      http.expectOne(`/api/catalog/variants/${VARIANT.id}/stock`);
    });
  });
});
