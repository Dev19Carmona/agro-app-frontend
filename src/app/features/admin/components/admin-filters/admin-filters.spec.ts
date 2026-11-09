import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminFilterField, AdminFilters } from './admin-filters';

const ID = '0123456789abcdef01234567';

const FIELDS: AdminFilterField[] = [
  {
    key: 'status',
    label: 'Estado',
    kind: 'select',
    options: [
      { value: '', label: 'Todos' },
      { value: 'ACTIVE', label: 'Activo' },
    ],
  },
  { key: 'buyerId', label: 'Id del comprador', kind: 'text', objectId: true },
];

@Component({
  imports: [AdminFilters],
  template: `<app-admin-filters
    ariaLabel="Filtros"
    [fields]="fields"
    [values]="values()"
    (valuesChange)="emitted.push($event)"
  />`,
})
class Host {
  fields = FIELDS;
  values = signal<Record<string, string>>({});
  emitted: Record<string, string>[] = [];
}

function setup(values: Record<string, string> = {}) {
  const f = TestBed.createComponent(Host);
  f.componentInstance.values.set(values);
  f.detectChanges();
  return f;
}

const textInput = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;
const form = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('form') as HTMLFormElement;
const buttonLabels = (f: ComponentFixture<Host>) =>
  Array.from(f.nativeElement.querySelectorAll('button')).map((b) =>
    (b as HTMLElement).textContent?.trim(),
  );

function type(f: ComponentFixture<Host>, value: string) {
  const input = textInput(f);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  f.detectChanges();
}

describe('AdminFilters', () => {
  it('muestra el valor aplicado en el campo de texto', () => {
    const f = setup({ buyerId: ID });
    expect(textInput(f).value).toBe(ID);
  });

  it('no muestra Quitar filtros sin filtros aplicados', () => {
    expect(buttonLabels(setup())).toEqual(['Filtrar']);
  });

  it('muestra Quitar filtros con un filtro aplicado y emite vacío al usarlo', () => {
    const f = setup({ buyerId: ID });
    expect(buttonLabels(f)).toContain('Quitar filtros');
    const clear = Array.from(f.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Quitar filtros',
    ) as HTMLButtonElement;
    clear.click();
    expect(f.componentInstance.emitted).toEqual([{}]);
  });

  it('Filtrar emite un id válido recortado', () => {
    const f = setup();
    type(f, `  ${ID}  `);
    form(f).dispatchEvent(new Event('submit'));
    expect(f.componentInstance.emitted).toEqual([{ buyerId: ID }]);
  });

  it('un id inválido no se emite y muestra el error', () => {
    const f = setup();
    type(f, 'abc');
    form(f).dispatchEvent(new Event('submit'));
    f.detectChanges();
    expect(f.componentInstance.emitted).toEqual([]);
    expect(f.nativeElement.textContent).toContain('24 caracteres');
  });

  it('un campo de texto vacío no se emite', () => {
    const f = setup({ buyerId: ID });
    type(f, '');
    form(f).dispatchEvent(new Event('submit'));
    expect(f.componentInstance.emitted).toEqual([{}]);
  });

  it('no emite si el texto no cambió respecto a lo aplicado', () => {
    const f = setup({ buyerId: ID });
    form(f).dispatchEvent(new Event('submit'));
    expect(f.componentInstance.emitted).toEqual([]);
  });
});
