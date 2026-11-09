import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicVariant } from '../../../../core/catalog';
import { VariantsTable } from './variants-table';

const BASE: PublicVariant = {
  id: 'v1',
  productId: 'p1',
  presentacion: 'Bulto 50 kg',
  unidad: 'kg',
  precio: 25000,
  precioVigente: 25000,
  disponible: 10,
};

@Component({
  imports: [VariantsTable],
  template: `<app-variants-table
    [variants]="variants"
    [requiresQuote]="requiresQuote"
    [showProduct]="showProduct"
    [productNames]="names"
    [canBuy]="canBuy"
    (addToCart)="added.push($event)"
  />`,
})
class Host {
  variants: PublicVariant[] = [BASE];
  requiresQuote = false;
  showProduct = false;
  names = new Map<string, string>();
  canBuy = false;
  added: { variantId: string; cantidad: number }[] = [];
}

function setupBuyer(patch: Partial<Host> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, { canBuy: true, ...patch });
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    root,
    host: fixture.componentInstance,
    input: () => root.querySelector<HTMLInputElement>('input[type="number"]'),
    button: () =>
      [...root.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Agregar al carrito'),
      ),
  };
}

function type(
  ctx: ReturnType<typeof setupBuyer>,
  value: string,
) {
  const el = ctx.input() as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('input'));
  ctx.fixture.detectChanges();
}

function setup(patch: Partial<Host> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('VariantsTable', () => {
  it('muestra presentación, unidad y precio vigente con formatCop', () => {
    const text = setup().textContent ?? '';
    expect(text).toContain('Bulto 50 kg');
    expect(text).toContain('kg');
    expect(text).toContain('$ 25.000');
  });

  it('sin oferta no tacha ningún precio', () => {
    const root = setup();
    expect(root.querySelector('s')).toBeNull();
    expect(root.textContent).not.toContain('Precio anterior');
  });

  it('con oferta muestra el vigente y el anterior tachado con texto accesible', () => {
    const root = setup({
      variants: [{ ...BASE, precio: 30000, precioOferta: 25000, precioVigente: 25000 }],
    });
    expect(root.textContent).toContain('$ 25.000');
    expect(root.querySelector('s')?.textContent).toContain('$ 30.000');
    expect(root.textContent).toContain('Precio anterior');
  });

  it('con disponible > 0 muestra la cantidad', () => {
    expect(setup().textContent).toContain('10 disponibles');
  });

  it('con disponible = 0 muestra "Sin stock" y no oculta la presentación', () => {
    const root = setup({ variants: [{ ...BASE, disponible: 0 }] });
    expect(root.textContent).toContain('Sin stock');
    expect(root.textContent).toContain('Bulto 50 kg');
  });

  it('con requiresQuote muestra "Precio a cotizar" y ningún precio', () => {
    const root = setup({ requiresQuote: true });
    expect(root.textContent).toContain('Precio a cotizar');
    expect(root.textContent).not.toContain('$');
  });

  it('muestra una fila por presentación', () => {
    const root = setup({
      variants: [BASE, { ...BASE, id: 'v2', presentacion: 'Bulto 25 kg' }],
    });
    expect(root.querySelectorAll('tr[mat-row]').length).toBe(2);
  });

  describe('con showProduct', () => {
    const two: PublicVariant[] = [
      BASE,
      { ...BASE, id: 'v2', productId: 'p2', presentacion: 'Litro' },
    ];

    it('sin showProduct no hay columna de producto', () => {
      expect(setup().querySelector('a')).toBeNull();
    });

    it('muestra el nombre del producto enlazado al detalle', () => {
      const root = setup({
        variants: two,
        showProduct: true,
        names: new Map([
          ['p1', 'Abono'],
          ['p2', 'Semilla'],
        ]),
      });
      const links = [...root.querySelectorAll('a')];
      expect(links.map((a) => a.textContent?.trim())).toEqual(['Abono', 'Semilla']);
      expect(links[0].getAttribute('href')).toBe('/catalogo/productos/p1');
    });

    it('si falta el nombre deja la fila con la presentación, el precio y un enlace sin nombre', () => {
      const root = setup({
        variants: two,
        showProduct: true,
        names: new Map([['p1', 'Abono']]),
      });
      const links = [...root.querySelectorAll('a')];
      expect(links[1].textContent?.trim()).toBe('Ver producto');
      expect(links[1].getAttribute('href')).toBe('/catalogo/productos/p2');
      expect(root.textContent).toContain('Litro');
      expect(root.textContent).toContain('$ 25.000');
    });
  });

  describe('con canBuy', () => {
    it('sin canBuy no hay cantidad ni botón', () => {
      const root = setup();
      expect(root.querySelector('input')).toBeNull();
      expect(root.textContent).not.toContain('Agregar al carrito');
    });

    it('muestra cantidad (1 por defecto) y botón en presentaciones con stock', () => {
      const { input, button } = setupBuyer();
      expect(input()?.value).toBe('1');
      expect(button()).toBeDefined();
    });

    it('no ofrece compra en una presentación sin stock', () => {
      const { input, button } = setupBuyer({ variants: [{ ...BASE, disponible: 0 }] });
      expect(input()).toBeNull();
      expect(button()).toBeUndefined();
    });

    it('emite addToCart con la presentación y la cantidad escrita', () => {
      const ctx = setupBuyer();
      type(ctx, '7');
      ctx.button()?.click();
      expect(ctx.host.added).toEqual([{ variantId: 'v1', cantidad: 7 }]);
    });

    it.each(['0', '-3', '2.5', '1001'])('con %s muestra el error y no emite', (bad) => {
      const ctx = setupBuyer();
      type(ctx, bad);
      expect(ctx.root.textContent).toContain('Entero entre 1 y 1000');
      expect((ctx.button() as HTMLButtonElement).disabled).toBe(true);
      ctx.button()?.click();
      expect(ctx.host.added).toEqual([]);
    });

    it('avisa cuando la cantidad supera la disponibilidad pero deja agregar', () => {
      const ctx = setupBuyer();
      type(ctx, '11');
      expect(ctx.root.textContent).toContain('Supera la disponibilidad actual');
      ctx.button()?.click();
      expect(ctx.host.added).toEqual([{ variantId: 'v1', cantidad: 11 }]);
    });
  });
});
