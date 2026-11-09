import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MyProduct, ProductView } from '../../models/proveedor.types';
import { ProductForm } from './product-form';

const CATEGORIES = [
  { id: '507f1f77bcf86cd799439021', nombre: 'Fertilizantes' },
  { id: '507f1f77bcf86cd799439022', nombre: 'Semillas' },
];
const PRODUCT: MyProduct = {
  id: '507f1f77bcf86cd799439031',
  storeId: '507f1f77bcf86cd799439011',
  categoryId: CATEGORIES[1].id,
  nombre: 'Semilla de maíz',
  marca: 'Agro',
  fichaTecnica: { Peso: '10 kg' },
  requiresQuote: false,
  activo: true,
  variantes: [],
};

function setup(product: MyProduct | null = null) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(ProductForm);
  fixture.componentRef.setInput('categories', CATEGORIES);
  fixture.componentRef.setInput('product', product);
  const saved: ProductView[] = [];
  fixture.componentInstance.saved.subscribe((p) => saved.push(p));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const text = async (selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const pickCategory = async (label: string) => {
    (el.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
    await settle();
    const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find((o) =>
      o.textContent?.includes(label),
    ) as HTMLElement;
    option.click();
    await settle();
  };
  const send = async () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  const errors = () =>
    Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
  return {
    el,
    settle,
    text,
    pickCategory,
    send,
    errors,
    saved,
    http: TestBed.inject(HttpTestingController),
  };
}

describe('ProductForm', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
  });

  describe('crear', () => {
    it('con todo vacío no envía y muestra los errores de nombre, marca y categoría', async () => {
      const { send, errors, http } = await setup();
      await send();
      http.expectNone('/api/catalog/products');
      expect(errors()).toEqual([
        'Escribe el nombre del producto',
        'Escribe la marca',
        'Elige una categoría',
      ]);
    });

    it('no muestra la casilla «Activo»', async () => {
      const { el } = await setup();
      expect(el.textContent).not.toContain('Activo');
      expect(el.textContent).toContain('Crear producto');
    });

    it('con datos válidos hace POST con la ficha como Record y emite el producto', async () => {
      const { el, text, pickCategory, send, settle, saved, http } = await setup();
      await text('input[autocomplete="off"]', ' Abono orgánico ');
      const inputs = Array.from(el.querySelectorAll('input[autocomplete="off"]'));
      (inputs[1] as HTMLInputElement).value = 'Agro Sur';
      inputs[1].dispatchEvent(new Event('input'));
      await pickCategory('Fertilizantes');
      (
        Array.from(el.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Agregar fila'),
        ) as HTMLButtonElement
      ).click();
      await settle();
      const ficha = Array.from(el.querySelectorAll('fieldset input')) as HTMLInputElement[];
      ficha[0].value = 'Nitrógeno';
      ficha[0].dispatchEvent(new Event('input'));
      ficha[1].value = '10%';
      ficha[1].dispatchEvent(new Event('input'));
      await send();

      const req = http.expectOne('/api/catalog/products');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        categoryId: CATEGORIES[0].id,
        nombre: 'Abono orgánico',
        marca: 'Agro Sur',
        fichaTecnica: { Nitrógeno: '10%' },
        requiresQuote: false,
      });
      req.flush(PRODUCT);
      await settle();
      expect(saved).toEqual([PRODUCT]);
    });

    it('una ficha con claves repetidas no se envía y marca la fila', async () => {
      const { el, text, pickCategory, send, settle, http } = await setup();
      await text('input[autocomplete="off"]', 'Abono');
      const inputs = Array.from(el.querySelectorAll('input[autocomplete="off"]'));
      (inputs[1] as HTMLInputElement).value = 'Agro';
      inputs[1].dispatchEvent(new Event('input'));
      await pickCategory('Fertilizantes');
      const add = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Agregar fila'),
      ) as HTMLButtonElement;
      add.click();
      add.click();
      await settle();
      const ficha = Array.from(el.querySelectorAll('fieldset input')) as HTMLInputElement[];
      [
        [0, 'Peso'],
        [1, '1'],
        [2, 'peso'],
        [3, '2'],
      ].forEach(([i, value]) => {
        ficha[i as number].value = value as string;
        ficha[i as number].dispatchEvent(new Event('input'));
      });
      await send();
      http.expectNone('/api/catalog/products');
      expect(el.querySelector('fieldset mat-error')?.textContent).toContain('repetida');
    });

    it('un 409 muestra el mensaje del backend y conserva lo escrito', async () => {
      const { el, text, pickCategory, send, settle, http } = await setup();
      await text('input[autocomplete="off"]', 'Abono');
      const marca = el.querySelectorAll('input[autocomplete="off"]')[1] as HTMLInputElement;
      marca.value = 'Agro';
      marca.dispatchEvent(new Event('input'));
      await pickCategory('Semillas');
      await send();
      http
        .expectOne('/api/catalog/products')
        .flush(
          { statusCode: 409, message: 'La tienda está desactivada' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();
      expect(el.querySelector('app-alert')?.textContent).toContain('La tienda está desactivada');
      expect((el.querySelector('input') as HTMLInputElement).value).toBe('Abono');
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('editar', () => {
    it('carga los valores del producto y muestra «Activo»', async () => {
      const { el } = await setup(PRODUCT);
      const values = Array.from(el.querySelectorAll('input[autocomplete="off"]')).map(
        (i) => (i as HTMLInputElement).value,
      );
      expect(values.slice(0, 4)).toEqual(['Semilla de maíz', 'Agro', 'Peso', '10 kg']);
      expect(el.textContent).toContain('Activo');
      expect(el.textContent).toContain('Guardar cambios');
    });

    it('guardar hace PATCH con activo y emite el producto', async () => {
      const { el, send, settle, saved, http } = await setup(PRODUCT);
      const activo = Array.from(el.querySelectorAll('input[type="checkbox"]')).pop() as HTMLInputElement;
      activo.click();
      await settle();
      await send();
      const req = http.expectOne(`/api/catalog/products/${PRODUCT.id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.activo).toBe(false);
      expect(req.request.body.fichaTecnica).toEqual({ Peso: '10 kg' });
      req.flush({ ...PRODUCT, activo: false });
      await settle();
      expect(saved[0].activo).toBe(false);
    });
  });
});
