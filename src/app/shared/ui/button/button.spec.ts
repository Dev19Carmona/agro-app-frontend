import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from '../icon/icon';
import { Button } from './button';
import { ButtonSize, ButtonVariant } from './button.types';

@Component({
  imports: [Button, Icon],
  template: `
    <button app-button id="text" [variant]="variant" [size]="size" [disabled]="disabled">
      Guardar
    </button>
    <button app-button id="submit" type="submit">Enviar</button>
    <button app-button id="icon" iconOnly ariaLabel="Abrir menú" [size]="size">
      <app-icon name="menu" />
    </button>
    <a app-button id="link" href="/catalogo" variant="secondary">Ir al catálogo</a>
  `,
})
class Host {
  variant: ButtonVariant = 'primary';
  size: ButtonSize = 'md';
  disabled = false;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const get = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  return { fixture, get };
}

describe('Button', () => {
  it('renderiza el contenido proyectado', () => {
    const { get } = setup();
    expect(get('text').textContent).toContain('Guardar');
  });

  it('es pill en todas las variantes', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const { get } = setup({ variant });
      expect(get('text').classList.contains('rounded-pill')).toBe(true);
    }
  });

  it.each<[ButtonVariant, string]>([
    ['primary', 'bg-brand'],
    ['secondary', 'border-line-strong'],
    ['danger', 'text-danger'],
    ['ghost', 'hover:bg-sunken'],
  ])('variant %s aplica %s', (variant, cls) => {
    const { get } = setup({ variant });
    expect(get('text').classList.contains(cls)).toBe(true);
  });

  it.each<[ButtonSize, string]>([
    ['sm', 'h-8'],
    ['md', 'h-10'],
    ['lg', 'h-12'],
  ])('size %s aplica %s', (size, cls) => {
    const { get } = setup({ size });
    expect(get('text').classList.contains(cls)).toBe(true);
  });

  it('type es "button" por defecto para no enviar formularios sin querer', () => {
    const { get } = setup();
    expect(get('text').getAttribute('type')).toBe('button');
    expect(get('submit').getAttribute('type')).toBe('submit');
  });

  it('un enlace no recibe atributo type', () => {
    const { get } = setup();
    expect(get('link').hasAttribute('type')).toBe(false);
    expect(get('link').getAttribute('href')).toBe('/catalogo');
  });

  it('iconOnly es cuadrado, expone aria-label y oculta el icono a lectores', () => {
    const { get } = setup({ size: 'lg' });
    const icon = get('icon');
    expect(icon.getAttribute('aria-label')).toBe('Abrir menú');
    expect(icon.classList.contains('size-12')).toBe(true);
    expect(icon.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('respeta disabled', () => {
    const { get } = setup({ disabled: true });
    expect((get('text') as HTMLButtonElement).disabled).toBe(true);
  });

  it('avisa en desarrollo si iconOnly no tiene ariaLabel', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    @Component({
      imports: [Button],
      template: `<button app-button iconOnly>x</button>`,
    })
    class NoLabel {}

    const fixture = TestBed.createComponent(NoLabel);
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('ariaLabel'));
    error.mockRestore();
  });
});
