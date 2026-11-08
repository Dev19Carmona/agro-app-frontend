import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, validate } from '@angular/forms/signals';
import { Checkbox } from './checkbox';

@Component({
  imports: [Checkbox],
  template: `
    <app-checkbox
      [hint]="hint()"
      [disabled]="disabled()"
      [errors]="errors()"
      [touched]="touched()"
      [(checked)]="checked"
    >
      Acepto el tratamiento de mis datos
    </app-checkbox>
  `,
})
class PlainHost {
  readonly hint = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly touched = signal(false);
  readonly errors = signal<{ kind: string; message?: string }[]>([]);
  readonly checked = signal(false);
}

@Component({
  imports: [Checkbox, FormField],
  template: `<app-checkbox [formField]="f.acepta">Acepto</app-checkbox>`,
})
class FormHost {
  readonly model = signal({ acepta: false });
  readonly f = form(this.model, (p) =>
    validate(p.acepta, ({ value }) =>
      value() ? null : { kind: 'required', message: 'Debes aceptar para continuar' },
    ),
  );
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const box = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
const errorRegion = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;

describe('Checkbox', () => {
  it('la etiqueta proyectada nombra la casilla', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toContain('Acepto el tratamiento de mis datos');
    expect(label.htmlFor).toBe(box(fixture).id);
    expect(box(fixture).checked).toBe(false);
  });

  it('marcar actualiza checked (modelo de dos vías)', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    box(fixture).click();
    await settle(fixture);
    expect(fixture.componentInstance.checked()).toBe(true);

    box(fixture).click();
    await settle(fixture);
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('un checked inicial se refleja en la casilla', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.checked.set(true);
    await settle(fixture);
    expect(box(fixture).checked).toBe(true);
  });

  it('la ayuda se enlaza con aria-describedby', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.hint.set('Puedes retirarlo cuando quieras');
    await settle(fixture);
    const hint = Array.from(fixture.nativeElement.querySelectorAll('p')).find((p) =>
      (p as HTMLElement).textContent?.includes('retirarlo'),
    ) as HTMLElement;
    expect(box(fixture).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('el error solo aparece si está tocado, en una región viva, y se enlaza al control', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.errors.set([{ kind: 'required', message: 'Debes aceptar' }]);
    await settle(fixture);
    expect(errorRegion(fixture)).not.toBeNull();
    expect(errorRegion(fixture).textContent?.trim()).toBe('');
    expect(box(fixture).getAttribute('aria-describedby') ?? '').toBe('');

    fixture.componentInstance.touched.set(true);
    await settle(fixture);
    expect(errorRegion(fixture).textContent).toContain('Debes aceptar');
    expect(box(fixture).getAttribute('aria-describedby')).toContain(errorRegion(fixture).id);
  });

  it('deshabilitado desactiva la casilla', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(box(fixture).disabled).toBe(true);
  });

  it('cada instancia tiene ids propios', async () => {
    const a = TestBed.createComponent(PlainHost);
    const b = TestBed.createComponent(PlainHost);
    await settle(a);
    await settle(b);
    expect(errorRegion(a).id).not.toBe(errorRegion(b).id);
  });

  describe('con Signal Forms ([formField])', () => {
    it('marcar actualiza el modelo del formulario', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      box(fixture).click();
      await settle(fixture);
      expect(fixture.componentInstance.model().acepta).toBe(true);
      expect(fixture.componentInstance.f.acepta().valid()).toBe(true);
    });

    it('al salir sin marcar se muestra el error del validador', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      box(fixture).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await settle(fixture);
      expect(fixture.componentInstance.f.acepta().touched()).toBe(true);
      expect(errorRegion(fixture).textContent).toContain('Debes aceptar para continuar');
    });
  });
});
