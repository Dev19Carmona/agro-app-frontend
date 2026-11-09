import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pagination, buildPaginationItems } from './pagination';
import { PaginationItem } from './pagination.types';

@Component({
  imports: [Pagination],
  template: `<app-pagination
    [(page)]="page"
    [totalPages]="totalPages"
    ariaLabel="Paginación de prueba"
  />`,
})
class Host {
  page = 1;
  totalPages = 10;
}

function setup(page = 1, totalPages = 10) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.page = page;
  fixture.componentInstance.totalPages = totalPages;
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { fixture, root, button };
}

function shape(items: PaginationItem[]): string {
  return items.map((i) => (i.kind === 'page' ? String(i.page) : '…')).join(' ');
}

describe('buildPaginationItems', () => {
  it.each<[number, number, string]>([
    [1, 1, '1'],
    [1, 3, '1 2 3'],
    [1, 5, '1 2 … 5'],
    [3, 5, '1 2 3 4 5'],
    [1, 10, '1 2 … 10'],
    [5, 10, '1 … 4 5 6 … 10'],
    [10, 10, '1 … 9 10'],
    [3, 10, '1 2 3 4 … 10'],
  ])('página %i de %i → %s', (current, total, expected) => {
    expect(shape(buildPaginationItems(current, total))).toBe(expected);
  });

  it('sin páginas no devuelve nada', () => {
    expect(buildPaginationItems(1, 0)).toEqual([]);
  });
});

describe('Pagination', () => {
  it.each([0, 1])('con totalPages=%i no se muestra', (total) => {
    const { root } = setup(1, total);
    expect(root.querySelector('nav')).toBeNull();
  });

  it('es una navegación con la etiqueta indicada', () => {
    const { root } = setup();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Paginación de prueba');
  });

  it('marca solo la página actual con aria-current="page"', () => {
    const { root } = setup(5);
    const current = root.querySelectorAll('[aria-current="page"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent?.trim()).toBe('5');
  });

  it('deshabilita anterior en la primera página', () => {
    const { button } = setup(1);
    expect(button('Página anterior')?.disabled).toBe(true);
    expect(button('Página siguiente')?.disabled).toBe(false);
  });

  it('deshabilita siguiente en la última página', () => {
    const { button } = setup(10);
    expect(button('Página siguiente')?.disabled).toBe(true);
    expect(button('Página anterior')?.disabled).toBe(false);
  });

  it('siguiente y anterior cambian la página', () => {
    const { fixture, button } = setup(5);
    button('Página siguiente')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page).toBe(6);
    button('Página anterior')?.click();
    fixture.detectChanges();
    button('Página anterior')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page).toBe(4);
  });

  it('pulsar un número va a esa página', () => {
    const { fixture, button } = setup(5);
    button('Página 10')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page).toBe(10);
  });

  it('acota una página fuera de rango', () => {
    const { root } = setup(999, 10);
    expect(root.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('10');
  });

  it('los botones son <button> nativos (alcanzables y activables con teclado)', () => {
    const { root } = setup(5);
    const buttons = root.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b.type).toBe('button'));
  });

  it('los puntos suspensivos no son accesibles', () => {
    const { root } = setup(5);
    const gaps = [...root.querySelectorAll('span')].filter((s) => s.textContent?.trim() === '…');
    expect(gaps.length).toBe(2);
    gaps.forEach((g) => expect(g.getAttribute('aria-hidden')).toBe('true'));
  });
});
