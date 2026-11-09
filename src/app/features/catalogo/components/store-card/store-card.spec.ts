import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicStore } from '../../../../core/catalog';
import { StoreCard } from './store-card';

const STORE: PublicStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Tienda Verde',
  municipio: 'Rionegro',
};

@Component({ imports: [StoreCard], template: `<app-store-card [store]="store" />` })
class Host {
  store = STORE;
}

describe('StoreCard', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra nombre y municipio', () => {
    const text = setup().textContent ?? '';
    expect(text).toContain('Tienda Verde');
    expect(text).toContain('Rionegro');
  });

  it('el nombre enlaza al detalle de la tienda', () => {
    const links = setup().querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe(`/catalogo/tiendas/${STORE.id}`);
  });
});
