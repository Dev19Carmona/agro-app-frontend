import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Product } from '../../../../core/catalog';
import { ProductCard } from './product-card';

const PRODUCT: Product = {
  id: '507f1f77bcf86cd799439011',
  storeId: '507f1f77bcf86cd799439012',
  categoryId: '507f1f77bcf86cd799439013',
  nombre: 'Abono orgánico',
  marca: 'AgroVida',
  fichaTecnica: {},
  requiresQuote: false,
  activo: true,
};

@Component({
  imports: [ProductCard],
  template: `<app-product-card
    [product]="product"
    [categoryName]="categoryName"
    [storeName]="storeName"
  />`,
})
class Host {
  product = PRODUCT;
  categoryName: string | null = 'Fertilizantes';
  storeName: string | null = 'Tienda Verde';
}

function setup(patch: Partial<Host> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProductCard', () => {
  it('muestra nombre, marca, categoría y tienda', () => {
    const text = setup().textContent ?? '';
    expect(text).toContain('Abono orgánico');
    expect(text).toContain('AgroVida');
    expect(text).toContain('Fertilizantes');
    expect(text).toContain('Tienda Verde');
  });

  it('el nombre es un único enlace al detalle del producto', () => {
    const links = setup().querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe(`/catalogo/productos/${PRODUCT.id}`);
  });

  it('no muestra precios', () => {
    expect(setup().textContent).not.toContain('$');
  });

  it('con requiresQuote muestra el badge "A cotizar"', () => {
    expect(setup({ product: { ...PRODUCT, requiresQuote: true } }).textContent).toContain(
      'A cotizar',
    );
  });

  it('sin requiresQuote no muestra "A cotizar"', () => {
    expect(setup().textContent).not.toContain('A cotizar');
  });

  it('omite la categoría y la tienda si no se conocen', () => {
    const text = setup({ categoryName: null, storeName: null }).textContent ?? '';
    expect(text).not.toContain('Fertilizantes');
    expect(text).not.toContain('Tienda Verde');
  });
});
