import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResourceState } from './resource-state';
import { ResourceStateError } from './resource-state.types';

@Component({
  imports: [ResourceState],
  template: `
    <app-resource-state
      [loading]="loading"
      [error]="error"
      [empty]="empty"
      emptyTitle="Sin productos"
      (retry)="retries = retries + 1"
    >
      <p id="contenido">Contenido</p>
      <a emptyActions href="/catalogo">Volver</a>
    </app-resource-state>
  `,
})
class Host {
  loading = false;
  error: ResourceStateError | null = null;
  empty = false;
  retries = 0;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('ResourceState', () => {
  it('muestra el contenido cuando no hay carga, error ni vacío', () => {
    const { root } = setup();
    expect(root.querySelector('#contenido')).not.toBeNull();
    expect(root.querySelector('[aria-busy]')).toBeNull();
  });

  it('cargando: aria-busy="true", texto para lector de pantalla y sin contenido', () => {
    const { root } = setup({ loading: true });
    const status = root.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toContain('Cargando');
    expect(root.querySelector('#contenido')).toBeNull();
  });

  it('error: muestra el mensaje con role="alert" y el botón Reintentar', () => {
    const { fixture, root } = setup({
      error: { message: 'No se pudo conectar con el servidor' },
    });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo conectar con el servidor',
    );
    expect(root.querySelector('#contenido')).toBeNull();
    const retry = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reintentar'),
    );
    retry?.click();
    expect(fixture.componentInstance.retries).toBe(1);
  });

  it('vacío: muestra el título y las acciones proyectadas', () => {
    const { root } = setup({ empty: true });
    expect(root.textContent).toContain('Sin productos');
    expect(root.querySelector('a[href="/catalogo"]')?.textContent).toContain('Volver');
    expect(root.querySelector('#contenido')).toBeNull();
  });

  it('el esqueleto de tabla se muestra con skeleton="table"', () => {
    const fixture = TestBed.createComponent(ResourceState);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('skeleton', 'table');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[aria-hidden="true"]').length).toBe(6);
  });

  it('la carga tiene prioridad sobre el error y el vacío', () => {
    const { root } = setup({
      loading: true,
      empty: true,
      error: { message: 'Fallo' },
    });
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('el error tiene prioridad sobre el vacío', () => {
    const { root } = setup({ empty: true, error: { message: 'Fallo' } });
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Sin productos');
  });
});
