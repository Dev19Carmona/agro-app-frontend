import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FichaRow } from '../../models/proveedor.types';
import { FichaIssue } from '../../utils/ficha-tecnica';
import { FichaTecnicaEditor } from './ficha-tecnica-editor';

@Component({
  imports: [FichaTecnicaEditor],
  template: `<app-ficha-tecnica-editor [(rows)]="rows" [issues]="issues()" />`,
})
class Host {
  readonly rows = signal<FichaRow[]>([{ clave: 'Peso', valor: '50 kg' }]);
  readonly issues = signal<FichaIssue[]>([]);
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      (b.getAttribute('aria-label') ?? b.textContent)?.includes(text),
    ) as HTMLButtonElement;
  return { fixture, el, settle, button, host: fixture.componentInstance };
}

describe('FichaTecnicaEditor', () => {
  it('muestra una fila por entrada con su clave y valor', async () => {
    const { el } = await setup();
    const inputs = Array.from(el.querySelectorAll('input'));
    expect(inputs.map((i) => i.value)).toEqual(['Peso', '50 kg']);
  });

  it('Agregar fila añade una fila vacía', async () => {
    const { button, settle, host, el } = await setup();
    button('Agregar fila').click();
    await settle();
    expect(host.rows()).toEqual([
      { clave: 'Peso', valor: '50 kg' },
      { clave: '', valor: '' },
    ]);
    expect(el.querySelectorAll('input').length).toBe(4);
  });

  it('editar la clave o el valor actualiza el modelo', async () => {
    const { el, settle, host } = await setup();
    const [clave, valor] = Array.from(el.querySelectorAll('input'));
    clave.value = 'Peso neto';
    clave.dispatchEvent(new Event('input'));
    valor.value = '25 kg';
    valor.dispatchEvent(new Event('input'));
    await settle();
    expect(host.rows()).toEqual([{ clave: 'Peso neto', valor: '25 kg' }]);
  });

  it('Quitar elimina la fila y tiene nombre accesible', async () => {
    const { button, settle, host } = await setup();
    button('Quitar la fila 1').click();
    await settle();
    expect(host.rows()).toEqual([]);
  });

  it('Agregar fila se deshabilita al llegar a 30 entradas', async () => {
    const { button, settle, host } = await setup();
    host.rows.set(Array.from({ length: 30 }, (_, i) => ({ clave: `k${i}`, valor: 'v' })));
    await settle();
    expect(button('Agregar fila').disabled).toBe(true);
  });

  it('muestra el problema de una fila junto a su clave y los del conjunto debajo', async () => {
    const { el, settle, host } = await setup();
    host.issues.set([
      { row: 0, message: 'La clave está repetida' },
      { row: null, message: 'La ficha admite hasta 30 entradas' },
    ]);
    await settle();
    expect(el.querySelector('mat-error')?.textContent).toContain('La clave está repetida');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('hasta 30 entradas');
  });
});
