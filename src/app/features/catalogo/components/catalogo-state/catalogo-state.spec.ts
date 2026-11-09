import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../../../core/http';
import { CatalogoState } from './catalogo-state';

@Component({
  imports: [CatalogoState],
  template: `
    <app-catalogo-state
      [loading]="loading"
      [error]="error"
      [empty]="empty"
      emptyTitle="Sin productos"
      (retry)="retries = retries + 1"
    >
      <p id="contenido">Contenido</p>
      <a emptyActions href="/catalogo">Volver</a>
    </app-catalogo-state>
  `,
})
class Host {
  loading = false;
  error: ApiError | null = null;
  empty = false;
  retries = 0;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('CatalogoState', () => {
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
      error: { status: 0, message: 'No se pudo conectar con el servidor' },
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

  it('la carga tiene prioridad sobre el error y el vacío', () => {
    const { root } = setup({
      loading: true,
      empty: true,
      error: { status: 500, message: 'Fallo' },
    });
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('el error tiene prioridad sobre el vacío', () => {
    const { root } = setup({ empty: true, error: { status: 500, message: 'Fallo' } });
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Sin productos');
  });
});
