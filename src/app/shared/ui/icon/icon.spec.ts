import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { ICON_PATHS } from './icon-paths';
import { IconName, IconSize } from './icon.types';

@Component({
  imports: [Icon],
  template: `<app-icon [name]="name" [size]="size" [label]="label" />`,
})
class Host {
  name: IconName = 'menu';
  size: IconSize = 'md';
  label: string | null = null;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const el = fixture.nativeElement.querySelector('app-icon') as HTMLElement;
  return { fixture, el, svg: el.querySelector('svg') as SVGElement };
}

describe('Icon', () => {
  it('pinta un path por cada trazo del icono', () => {
    const { svg } = setup({ name: 'sun' });
    expect(svg.querySelectorAll('path').length).toBe(ICON_PATHS.sun.length);
  });

  it('es decorativo por defecto', () => {
    const { el } = setup();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('con label se expone como imagen con ese texto', () => {
    const { el } = setup({ label: 'Tema oscuro' });
    expect(el.getAttribute('aria-hidden')).toBeNull();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Tema oscuro');
  });

  it.each<[IconSize, string]>([
    ['sm', 'size-4'],
    ['md', 'size-5'],
    ['lg', 'size-6'],
  ])('size %s aplica %s', (size, cls) => {
    const { svg } = setup({ size });
    expect(svg.classList.contains(cls)).toBe(true);
  });

  it('todos los iconos tienen al menos un path', () => {
    for (const paths of Object.values(ICON_PATHS)) {
      expect(paths.length).toBeGreaterThan(0);
    }
  });
});
