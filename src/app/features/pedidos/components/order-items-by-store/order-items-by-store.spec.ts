import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartItem } from '../../../../core/cart';
import { OrderItemsByStore } from './order-items-by-store';

function line(variantId: string, storeId: string | undefined, patch: Partial<CartItem> = {}) {
  return {
    variantId,
    cantidad: 2,
    disponible: 10,
    apta: true,
    storeId,
    nombreProducto: `Producto ${variantId}`,
    presentacion: 'Bulto',
    unidad: 'kg',
    precioVigente: 1000,
    ...patch,
  } satisfies CartItem;
}

@Component({
  imports: [OrderItemsByStore],
  template: `<app-order-items-by-store
    [items]="items"
    [storeNames]="names"
    [invalidIds]="invalid"
    (removeLine)="removed.push($event)"
  />`,
})
class Host {
  items: CartItem[] = [];
  names = new Map<string, string>();
  invalid = new Set<string>();
  removed: string[] = [];
}

function setup(patch: Partial<Host>) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return { host: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}

describe('OrderItemsByStore', () => {
  it('agrupa las líneas por tienda con su nombre', () => {
    const { root } = setup({
      items: [line('v1', 's1'), line('v2', 's2'), line('v3', 's1')],
      names: new Map([
        ['s1', 'Tienda Verde'],
        ['s2', 'Agro Sur'],
      ]),
    });
    const sections = [...root.querySelectorAll('section')];
    expect(sections.length).toBe(2);
    expect(sections[0].querySelector('h2')?.textContent).toContain('Tienda Verde');
    expect(sections[0].querySelectorAll('li').length).toBe(2);
    expect(sections[1].querySelector('h2')?.textContent).toContain('Agro Sur');
  });

  it('si falta el nombre de la tienda usa "Tienda"', () => {
    const { root } = setup({ items: [line('v1', 's1')] });
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Tienda');
  });

  it('muestra cantidad, precio y subtotal con formatCop', () => {
    const { root } = setup({ items: [line('v1', 's1')] });
    expect(root.textContent).toContain('2 × $ 1.000');
    expect(root.textContent).toContain('$ 2.000');
  });

  it('marca las líneas inválidas y permite quitarlas', () => {
    const { root, host } = setup({
      items: [line('v1', 's1'), line('v2', 's1')],
      invalid: new Set(['v2']),
    });
    expect(root.textContent).toContain('No se puede comprar');
    const buttons = root.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    buttons[0].click();
    expect(host.removed).toEqual(['v2']);
  });

  it('una línea no apta se marca aunque el backend no la haya rechazado aún', () => {
    const { root } = setup({ items: [line('v1', 's1', { apta: false })] });
    expect(root.textContent).toContain('No se puede comprar');
  });

  it('las líneas sin tienda quedan juntas bajo el nombre por defecto', () => {
    const { root } = setup({
      items: [{ variantId: 'v9', cantidad: 1, disponible: 0, apta: false }],
    });
    expect(root.textContent).toContain('Producto no disponible');
    expect(root.textContent).toContain('—');
  });
});
