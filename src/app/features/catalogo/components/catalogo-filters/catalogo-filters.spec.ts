import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PublicCategory } from '../../../../core/catalog';
import { FiltersValue } from '../../models/catalogo.types';
import { CatalogoFilters } from './catalogo-filters';

const CATEGORIES: PublicCategory[] = [
  { id: '507f1f77bcf86cd799439011', nombre: 'Semillas' },
  { id: '507f1f77bcf86cd799439012', nombre: 'Fertilizantes' },
];

@Component({
  imports: [CatalogoFilters],
  template: `<app-catalogo-filters
    [categories]="categories"
    [categoryId]="categoryId"
    [municipio]="municipio"
    (filtersChange)="emitted.push($event)"
  />`,
})
class Host {
  categories: PublicCategory[] | null = CATEGORIES;
  categoryId = '';
  municipio = '';
  emitted: FiltersValue[] = [];
}

@Component({
  imports: [CatalogoFilters],
  template: `<app-catalogo-filters [municipio]="municipio()" />`,
})
class SignalHost {
  municipio = signal('Bello');
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = () => root.querySelector<HTMLInputElement>('input')!;
  const buttonByText = (text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, root, input, buttonByText, type, host: fixture.componentInstance };
}

describe('CatalogoFilters', () => {
  it('muestra el selector de categoría y el campo de municipio', () => {
    const { root } = setup();
    expect(root.querySelector('app-select')).not.toBeNull();
    expect(root.querySelector('app-input')).not.toBeNull();
  });

  it('sin categorías (tiendas) no muestra el selector', () => {
    const { root } = setup({ categories: null });
    expect(root.querySelector('app-select')).toBeNull();
    expect(root.querySelector('app-input')).not.toBeNull();
  });

  it('el campo de municipio parte del valor aplicado', () => {
    expect(setup({ municipio: 'Bello' }).input().value).toBe('Bello');
  });

  it('Filtrar emite el municipio recortado', () => {
    const { buttonByText, type, host } = setup();
    type('  Rionegro  ');
    buttonByText('Filtrar')!.click();
    expect(host.emitted).toEqual([{ municipio: 'Rionegro' }]);
  });

  it('Filtrar con el municipio vacío emite un conjunto sin municipio', () => {
    const { buttonByText, type, host } = setup();
    type('   ');
    buttonByText('Filtrar')!.click();
    expect(host.emitted).toEqual([{}]);
  });

  it('limita el municipio a 100 caracteres', () => {
    const { buttonByText, type, host } = setup();
    type('a'.repeat(150));
    buttonByText('Filtrar')!.click();
    expect(host.emitted[0].municipio).toHaveLength(100);
  });

  it('conserva la categoría aplicada al filtrar por municipio', () => {
    const { buttonByText, type, host } = setup({ categoryId: CATEGORIES[0].id });
    type('Bello');
    buttonByText('Filtrar')!.click();
    expect(host.emitted).toEqual([{ categoryId: CATEGORIES[0].id, municipio: 'Bello' }]);
  });

  it('Limpiar solo aparece con filtros aplicados y emite un conjunto vacío', () => {
    expect(setup().buttonByText('Limpiar')).toBeUndefined();
    const { buttonByText, host } = setup({ municipio: 'Bello' });
    buttonByText('Limpiar')!.click();
    expect(host.emitted).toEqual([{}]);
  });

  it('los borradores siguen a los valores aplicados (p. ej. al pulsar Atrás)', () => {
    const fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
    const input = () => (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input().value).toBe('Bello');
    fixture.componentInstance.municipio.set('Medellín');
    fixture.detectChanges();
    expect(input().value).toBe('Medellín');
  });
});
