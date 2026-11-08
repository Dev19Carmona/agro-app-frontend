import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Alert } from './alert';
import { AlertVariant } from './alert.types';

@Component({
  imports: [Alert],
  template: `<app-alert [variant]="variant" [title]="title">Credenciales inválidas</app-alert>`,
})
class Host {
  variant: AlertVariant = 'info';
  title: string | null = null;
}

function setup(config: { variant?: AlertVariant; title?: string } = {}) {
  const fixture = TestBed.createComponent(Host);
  if (config.variant) fixture.componentInstance.variant = config.variant;
  if (config.title) fixture.componentInstance.title = config.title;
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('app-alert') as HTMLElement;
}

describe('Alert', () => {
  it('renderiza el contenido proyectado', () => {
    expect(setup().textContent).toContain('Credenciales inválidas');
  });

  it('usa info y role="status" por defecto', () => {
    const el = setup();
    expect(el.getAttribute('role')).toBe('status');
    expect(el.classList.contains('border-info')).toBe(true);
  });

  it.each<[AlertVariant, string, string]>([
    ['danger', 'alert', 'border-danger'],
    ['info', 'status', 'border-info'],
    ['success', 'status', 'border-brand-text'],
  ])('%s usa role="%s" y %s', (variant, role, border) => {
    const el = setup({ variant });
    expect(el.getAttribute('role')).toBe(role);
    expect(el.classList.contains(border)).toBe(true);
  });

  it('el icono es decorativo', () => {
    const icon = setup({ variant: 'danger' }).querySelector('app-icon') as HTMLElement;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('muestra el título solo si se da', () => {
    expect(setup().querySelector('p')).toBeNull();
    const el = setup({ title: 'Solicitud pendiente' });
    expect(el.querySelector('p')?.textContent).toContain('Solicitud pendiente');
  });
});
