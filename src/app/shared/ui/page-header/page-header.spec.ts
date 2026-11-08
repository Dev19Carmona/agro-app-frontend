import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="Pedidos" [description]="description">
      @if (withActions) {
        <button actions id="action">Nuevo</button>
      }
    </app-page-header>
  `,
})
class Host {
  description: string | null = 'Historial de compras.';
  withActions = true;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PageHeader', () => {
  it('renderiza el título como h1', () => {
    expect(setup().querySelector('h1')?.textContent).toContain('Pedidos');
  });

  it('muestra la descripción si existe y la omite si no', () => {
    expect(setup().querySelector('p')?.textContent).toContain('Historial de compras.');
    expect(setup({ description: null }).querySelector('p')).toBeNull();
  });

  it('proyecta las acciones en su zona', () => {
    const el = setup();
    expect(el.querySelector('header > div:last-child #action')).not.toBeNull();
  });

  it('la zona de acciones sin contenido queda vacía (se oculta con empty:hidden)', () => {
    const zone = setup({ withActions: false }).querySelector('header > div:last-child');
    expect(zone?.children.length).toBe(0);
    expect(zone?.classList.contains('empty:hidden')).toBe(true);
  });
});
