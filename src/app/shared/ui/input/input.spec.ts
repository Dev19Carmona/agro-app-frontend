import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { Input } from './input';
import { InputType } from './input.types';

@Component({
  imports: [Input],
  template: `
    <app-input
      label="Correo"
      [type]="type()"
      [hint]="hint()"
      [disabled]="disabled()"
      [errors]="errors()"
      [touched]="touched()"
      [(value)]="value"
    />
  `,
})
class PlainHost {
  readonly type = signal<InputType>('text');
  readonly hint = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly touched = signal(false);
  readonly errors = signal<{ kind: string; message?: string }[]>([]);
  readonly value = signal('');
}

@Component({
  imports: [Input, FormField],
  template: `<app-input label="Correo" type="email" [formField]="f.email" />`,
})
class FormHost {
  readonly model = signal({ email: '' });
  readonly f = form(this.model, (p) => required(p.email, { message: 'Escribe tu correo' }));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function field(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input') as HTMLInputElement;
}

describe('Input', () => {
  it('etiqueta el campo con su label y usa text por defecto', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('label')?.textContent).toContain('Correo');
    expect(field(fixture).type).toBe('text');
    // La etiqueta está asociada al campo: su nombre accesible es "Correo".
    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(field(fixture).id);
  });

  it('escribir actualiza el value (modelo de dos vías)', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await settle(fixture);
    field(fixture).value = 'ana@agro.test';
    field(fixture).dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('ana@agro.test');
  });

  it('muestra la ayuda cuando no hay error', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.hint.set('Usa tu correo de trabajo');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-hint')?.textContent).toContain('Usa tu correo de trabajo');
    expect(field(fixture).getAttribute('aria-describedby')).toContain(
      el.querySelector('mat-hint')?.id,
    );
  });

  it('el error solo aparece si el campo está tocado y se enlaza con aria-describedby', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.errors.set([{ kind: 'required', message: 'Campo obligatorio' }]);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-error')).toBeNull();
    expect(field(fixture).getAttribute('aria-invalid')).not.toBe('true');

    fixture.componentInstance.touched.set(true);
    await settle(fixture);
    const error = el.querySelector('mat-error') as HTMLElement;
    expect(error.textContent).toContain('Campo obligatorio');
    expect(field(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(field(fixture).getAttribute('aria-describedby')).toContain(error.id);
  });

  it('un error sin message no se muestra', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.errors.set([{ kind: 'required' }]);
    fixture.componentInstance.touched.set(true);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
  });

  it('deshabilitado desactiva el campo', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(field(fixture).disabled).toBe(true);
  });

  describe('contraseña', () => {
    async function setup() {
      const fixture = TestBed.createComponent(PlainHost);
      fixture.componentInstance.type.set('password');
      await settle(fixture);
      const toggle = () =>
        fixture.nativeElement.querySelector('button[aria-pressed]') as HTMLButtonElement;
      return { fixture, toggle };
    }

    it('oculta el texto y ofrece un botón con aria-label y aria-pressed', async () => {
      const { fixture, toggle } = await setup();
      expect(field(fixture).type).toBe('password');
      expect(toggle().getAttribute('aria-label')).toBe('Mostrar contraseña');
      expect(toggle().getAttribute('aria-pressed')).toBe('false');
      expect(toggle().type).toBe('button');
    });

    it('el botón alterna entre mostrar y ocultar', async () => {
      const { fixture, toggle } = await setup();
      toggle().click();
      await settle(fixture);
      expect(field(fixture).type).toBe('text');
      expect(toggle().getAttribute('aria-label')).toBe('Ocultar contraseña');
      expect(toggle().getAttribute('aria-pressed')).toBe('true');

      toggle().click();
      await settle(fixture);
      expect(field(fixture).type).toBe('password');
    });

    it('los demás tipos no muestran el botón', async () => {
      const fixture = TestBed.createComponent(PlainHost);
      fixture.componentInstance.type.set('email');
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('button[aria-pressed]')).toBeNull();
      expect(field(fixture).type).toBe('email');
    });
  });

  describe('con Signal Forms ([formField])', () => {
    it('escribir actualiza el modelo del formulario', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      field(fixture).value = 'ana@agro.test';
      field(fixture).dispatchEvent(new Event('input'));
      await settle(fixture);
      expect(fixture.componentInstance.model().email).toBe('ana@agro.test');
    });

    it('cambiar el modelo actualiza el campo', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      fixture.componentInstance.model.set({ email: 'otra@agro.test' });
      await settle(fixture);
      expect(field(fixture).value).toBe('otra@agro.test');
    });

    it('al salir del campo vacío se marca tocado y aparece el error del validador', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('mat-error')).toBeNull();

      field(fixture).dispatchEvent(new Event('blur'));
      await settle(fixture);
      expect(fixture.componentInstance.f.email().touched()).toBe(true);
      expect(el.querySelector('mat-error')?.textContent).toContain('Escribe tu correo');
    });

    it('el campo refleja required del esquema', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
      expect(field(fixture).required).toBe(true);
    });
  });
});
