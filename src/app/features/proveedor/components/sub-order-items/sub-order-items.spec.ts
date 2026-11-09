import { TestBed } from '@angular/core/testing';
import { ProviderOrderItem } from '../../models/proveedor.types';
import { SubOrderItems } from './sub-order-items';

const ITEMS: ProviderOrderItem[] = [
  {
    id: 'i1',
    variantId: 'v1',
    productId: 'p1',
    nombreProducto: 'Abono orgánico',
    presentacion: 'Bulto',
    unidad: '50 kg',
    precioUnitario: 90000,
    cantidad: 2,
    subtotal: 180000,
  },
  {
    id: 'i2',
    variantId: 'v2',
    productId: 'p2',
    nombreProducto: 'Semilla de maíz',
    presentacion: 'Saco',
    unidad: '25 kg',
    precioUnitario: 50000,
    cantidad: 1,
    subtotal: 50000,
  },
];

describe('SubOrderItems', () => {
  it('muestra nombre, presentación, precio unitario, cantidad y subtotal con formatCop', () => {
    const fixture = TestBed.createComponent(SubOrderItems);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Producto', 'Presentación', 'Precio unitario', 'Cantidad', 'Subtotal']);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) =>
      Array.from(r.querySelectorAll('td')).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('Abono orgánico');
    expect(rows[0][1]).toBe('Bulto · 50 kg');
    expect(rows[0][2]).toMatch(/90\.000/);
    expect(rows[0][3]).toBe('2');
    expect(rows[0][4]).toMatch(/180\.000/);
    expect(rows[1][4]).toMatch(/50\.000/);
  });
});
