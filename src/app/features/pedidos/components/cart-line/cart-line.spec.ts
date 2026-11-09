import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartItem } from '../../../../core/cart';
import { CartLine } from './cart-line';

const ITEM: CartItem = {
  variantId: 'v1',
  cantidad: 3,
  disponible: 10,
  apta: true,
  productId: 'p1',
  storeId: 's1',
  nombreProducto: 'Abono orgánico',
  presentacion: 'Bulto 50 kg',
  unidad: 'kg',
  precioVigente: 25000,
};

@Component({
  imports: [CartLine],
  template: `<app-cart-line
    [item]="item()"
    [busy]="busy"
    (quantityChange)="changes.push($event)"
    (remove)="removed = removed + 1"
  />`,
})
class Host {
  item = signal<CartItem>(ITEM);
  busy = false;
  changes: number[] = [];
  removed = 0;
}

function setup(item: CartItem = ITEM) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.item.set(item);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = () => root.querySelector<HTMLInputElement>('input[type="number"]');
  const type = (value: string) => {
    const el = input() as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, root, input, type };
}

describe('CartLine', () => {
  it('muestra producto, presentación, precio vigente, cantidad, subtotal y disponibilidad', () => {
    const { root, input } = setup();
    const text = root.textContent ?? '';
    expect(text).toContain('Abono orgánico');
    expect(text).toContain('Bulto 50 kg');
    expect(text).toContain('$ 25.000');
    expect(text).toContain('$ 75.000');
    expect(text).toContain('10 disponibles');
    expect(input()?.value).toBe('3');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/catalogo/productos/p1');
  });

  it('emite quantityChange con Enter y con blur cuando el valor es válido y distinto', () => {
    const { host, input, type, fixture } = setup();
    type('5');
    input()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.changes).toEqual([5]);
    type('6');
    input()?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host.changes).toEqual([5, 6]);
  });

  it('no emite si la cantidad no cambió', () => {
    const { host, input } = setup();
    input()?.dispatchEvent(new Event('blur'));
    expect(host.changes).toEqual([]);
  });

  it.each(['0', '-2', '2.5', '1001'])('con %s muestra el error y no emite', (bad) => {
    const { host, root, input, type } = setup();
    type(bad);
    input()?.dispatchEvent(new Event('blur'));
    expect(root.textContent).toContain('entero entre 1 y 1000');
    expect(host.changes).toEqual([]);
  });

  it('un campo vacío no se envía', () => {
    const { host, input, type } = setup();
    type('');
    input()?.dispatchEvent(new Event('blur'));
    expect(host.changes).toEqual([]);
  });

  it('Quitar emite remove con un aria-label que nombra el producto', () => {
    const { host, root } = setup();
    const button = root.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Quitar del carrito: Abono orgánico');
    button.click();
    expect(host.removed).toBe(1);
  });

  it('avisa si la cantidad supera la disponibilidad', () => {
    const { root } = setup({ ...ITEM, cantidad: 20 });
    expect(root.textContent).toContain('Supera la disponibilidad actual');
  });

  it('una línea no apta se marca como no disponible y no deja editar la cantidad', () => {
    const { root, input } = setup({ ...ITEM, apta: false });
    expect(root.textContent).toContain('No disponible');
    expect(input()).toBeNull();
  });

  it('una variante que ya no existe se muestra sin nombre ni precio y se puede quitar', () => {
    const { root } = setup({ variantId: 'v9', cantidad: 2, disponible: 0, apta: false });
    expect(root.textContent).toContain('Producto no disponible');
    expect(root.textContent).toContain('—');
    expect(root.querySelector('button')).not.toBeNull();
  });

  it('el campo vuelve a la cantidad del carrito cuando esta cambia', () => {
    const { fixture, host, input, type } = setup();
    type('9');
    host.item.set({ ...ITEM, cantidad: 4 });
    fixture.detectChanges();
    expect(input()?.value).toBe('4');
  });
});
