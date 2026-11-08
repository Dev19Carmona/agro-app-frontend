import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { Select } from './select';
import { SelectOption } from './select.types';

const OPTIONS: SelectOption[] = [
  { value: 'PRODUCTOR', label: 'Productor' },
  { value: 'PROVEEDOR', label: 'Proveedor' },
  { value: 'ADMIN', label: 'Administrador', disabled: true },
];

@Component({
  imports: [Select],
  template: `
    <app-select
      label="Rol"
      placeholder="Elige un rol"
      [options]="options"
      [hint]="hint()"
      [disabled]="disabled()"
      [errors]="errors()"
      [touched]="touched()"
      [(value)]="value"
    />
  `,
})
class PlainHost {
  readonly options = OPTIONS;
  readonly hint = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly touched = signal(false);
  readonly errors = signal<{ kind: string; message?: string }[]>([]);
  readonly value = signal('');
}

@Component({
  imports: [Select, FormField],
  template: `<app-select label="Rol" [options]="options" [formField]="f.rol" />`,
})
class FormHost {
  readonly options = OPTIONS;
  readonly model = signal({ rol: '' });
  readonly f = form(this.model, (p) => required(p.rol, { message: 'Elige un rol' }));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const select = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('mat-select') as HTMLElement;
const trigger = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('.mat-mdc-select-trigger') as HTMLElement;
const optionEls = () => Array.from(document.querySelectorAll<HTMLElement>('mat-option'));

async function open(fixture: ComponentFixture<unknown>) {
  trigger(fixture).click();
  await settle(fixture);
}

describe('Select', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
  });

  it('muestra la etiqueta y el placeholder cuando no hay valor', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('label')?.textContent).toContain('Rol');
    expect(el.querySelector('.mat-mdc-select-placeholder')?.textContent).toContain('Elige un rol');
    expect(select(fixture).getAttribute('role')).toBe('combobox');
  });

  it('lista las opciones y respeta las deshabilitadas', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    await open(fixture);
    expect(optionEls().map((o) => o.textContent?.trim())).toEqual([
      'Productor',
      'Proveedor',
      'Administrador',
    ]);
    expect(optionEls()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('elegir una opción actualiza el value (modelo de dos vías)', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    await open(fixture);
    optionEls()[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('PROVEEDOR');
    expect(select(fixture).textContent).toContain('Proveedor');
  });

  it('un value inicial se refleja en el texto mostrado', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.value.set('PRODUCTOR');
    await settle(fixture);
    expect(select(fixture).textContent).toContain('Productor');
  });

  it('muestra la ayuda', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.hint.set('Un proveedor necesita aprobación');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('mat-hint')?.textContent).toContain(
      'necesita aprobación',
    );
  });

  it('el error solo aparece si está tocado y se enlaza con aria-describedby', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.errors.set([{ kind: 'required', message: 'Elige un rol' }]);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-error')).toBeNull();

    fixture.componentInstance.touched.set(true);
    await settle(fixture);
    const error = el.querySelector('mat-error') as HTMLElement;
    expect(error.textContent).toContain('Elige un rol');
    expect(select(fixture).getAttribute('aria-describedby')).toContain(error.id);
    expect(select(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('deshabilitado no abre la lista', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(select(fixture).getAttribute('aria-disabled')).toBe('true');
    await open(fixture);
    expect(optionEls().length).toBe(0);
  });

  describe('con Signal Forms ([formField])', () => {
    it('elegir una opción actualiza el modelo', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      await open(fixture);
      optionEls()[0].click();
      await settle(fixture);
      expect(fixture.componentInstance.model().rol).toBe('PRODUCTOR');
    });

    it('cerrar la lista sin elegir marca el campo como tocado y muestra el error', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      await open(fixture);
      document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
      await settle(fixture);
      await settle(fixture);
      expect(fixture.componentInstance.f.rol().touched()).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-error')?.textContent).toContain(
        'Elige un rol',
      );
    });
  });
});
