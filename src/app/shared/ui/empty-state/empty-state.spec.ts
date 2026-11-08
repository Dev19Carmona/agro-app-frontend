import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconName } from '../icon/icon.types';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state
      title="Tu carrito está vacío"
      [description]="description"
      [icon]="icon"
      [headingLevel]="level"
    >
      @if (withActions) {
        <button actions id="action">Ver catálogo</button>
      }
    </app-empty-state>
  `,
})
class Host {
  description: string | null = 'Agrega productos para armar tu pedido.';
  icon: IconName = 'cart';
  level: 2 | 3 | 4 = 2;
  withActions = true;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('EmptyState', () => {
  it('muestra título como encabezado de nivel 2 por defecto', () => {
    const heading = setup().querySelector('[role="heading"]') as HTMLElement;
    expect(heading.textContent).toContain('Tu carrito está vacío');
    expect(heading.getAttribute('aria-level')).toBe('2');
  });

  it('respeta headingLevel', () => {
    const heading = setup({ level: 3 }).querySelector('[role="heading"]') as HTMLElement;
    expect(heading.getAttribute('aria-level')).toBe('3');
  });

  it('muestra la descripción solo si existe', () => {
    expect(setup().textContent).toContain('Agrega productos');
    expect(setup({ description: null }).textContent).not.toContain('Agrega productos');
  });

  it('pinta el icono indicado como decorativo', () => {
    const icon = setup().querySelector('app-icon') as HTMLElement;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('proyecta las acciones y oculta la zona si no hay', () => {
    expect(setup().querySelector('#action')).not.toBeNull();
    const el = setup({ withActions: false });
    const zone = el.querySelector('.empty\\:hidden');
    expect(zone?.children.length).toBe(0);
  });
});
