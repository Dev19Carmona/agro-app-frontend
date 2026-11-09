import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogApi } from '../../../core/catalog';
import { isObjectId } from './object-id';
import { loadStoreNames } from './store-names';

describe('loadStoreNames', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { catalog: TestBed.inject(CatalogApi), http: TestBed.inject(HttpTestingController) };
  }

  it('devuelve un mapa storeId → nombre', () => {
    const { catalog, http } = setup();
    let result: Map<string, string> | undefined;
    loadStoreNames(catalog, ['s1', 's2']).subscribe((map) => (result = map));
    http.expectOne('/api/catalog/stores/s1').flush({ id: 's1', nombre: 'Verde', municipio: 'A' });
    http.expectOne('/api/catalog/stores/s2').flush({ id: 's2', nombre: 'Sur', municipio: 'B' });
    expect([...(result ?? [])]).toEqual([
      ['s1', 'Verde'],
      ['s2', 'Sur'],
    ]);
  });

  it('una consulta que falla no rompe las demás', () => {
    const { catalog, http } = setup();
    let result: Map<string, string> | undefined;
    loadStoreNames(catalog, ['s1', 's2']).subscribe((map) => (result = map));
    http.expectOne('/api/catalog/stores/s1').flush('Error', { status: 500, statusText: 'Error' });
    http.expectOne('/api/catalog/stores/s2').flush({ id: 's2', nombre: 'Sur', municipio: 'B' });
    expect([...(result ?? [])]).toEqual([['s2', 'Sur']]);
  });

  it('sin tiendas devuelve un mapa vacío sin pedir nada', () => {
    const { catalog, http } = setup();
    let result: Map<string, string> | undefined;
    loadStoreNames(catalog, []).subscribe((map) => (result = map));
    expect(result?.size).toBe(0);
    http.verify();
  });
});

describe('isObjectId', () => {
  it('acepta 24 caracteres hexadecimales y nada más', () => {
    expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isObjectId('507F1F77BCF86CD799439011')).toBe(true);
    expect(isObjectId('507f1f77bcf86cd79943901')).toBe(false);
    expect(isObjectId('xyz')).toBe(false);
    expect(isObjectId('')).toBe(false);
  });
});
