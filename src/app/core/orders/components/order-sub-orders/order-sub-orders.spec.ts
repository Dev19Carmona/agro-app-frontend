import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SubOrder } from '../../models/orders.types';
import { OrderSubOrders } from './order-sub-orders';

const SUBS: SubOrder[] = [
  {
    id: 'so1',
    storeId: 's1',
    subtotal: 230000,
    items: [
      {
        id: 'i1',
        variantId: 'v1',
        productId: 'p1',
        nombreProducto: 'Abono',
        presentacion: 'Bulto',
        unidad: 'kg',
        precioUnitario: 90000,
        cantidad: 2,
        subtotal: 180000,
      },
      {
        id: 'i2',
        variantId: 'v2',
        productId: 'p2',
        nombreProducto: 'Semilla',
        presentacion: 'Saco',
        unidad: 'kg',
        precioUnitario: 50000,
        cantidad: 1,
        subtotal: 50000,
      },
    ],
  },
  { id: 'so2', storeId: 's2', subtotal: 1000, items: [] },
];

@Component({
  imports: [OrderSubOrders],
  template: `<app-order-sub-orders [subOrders]="subs" [storeNames]="names" />`,
})
class Host {
  subs = SUBS;
  names = new Map([['s1', 'Tienda Verde']]);
}

describe('OrderSubOrders', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra una sección por tienda con su nombre y su subtotal', () => {
    const sections = [...render().querySelectorAll('section')];
    expect(sections.length).toBe(2);
    expect(sections[0].querySelector('h2')?.textContent).toContain('Tienda Verde');
    expect(sections[0].textContent).toContain('$ 230.000');
    expect(sections[1].querySelector('h2')?.textContent?.trim()).toBe('Tienda');
  });

  it('muestra el snapshot de cada ítem con formatCop', () => {
    const rows = [...render().querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Abono');
    expect(rows[0]).toContain('Bulto · kg');
    expect(rows[0]).toContain('$ 90.000');
    expect(rows[0]).toContain('2');
    expect(rows[0]).toContain('$ 180.000');
  });

  it('el nombre del producto enlaza a su detalle', () => {
    expect(render().querySelector('tbody a')?.getAttribute('href')).toBe('/catalogo/productos/p1');
  });
});
