import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaymentForm, PaymentFormValue } from './payment-form';

@Component({
  imports: [PaymentForm],
  template: `<app-payment-form [busy]="busy()" (submitted)="values.push($event)" />`,
})
class Host {
  readonly busy = signal(false);
  readonly values: PaymentFormValue[] = [];
}

interface FormInternals {
  model: WritableSignal<{ metodo: string; escenario: string; otroToken: string }>;
}

async function setup() {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const form = fixture.debugElement.children[0].componentInstance as FormInternals;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const submit = async () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  return { fixture, el, form, settle, submit, host: fixture.componentInstance };
}

describe('PaymentForm', () => {
  it('está rotulado como simulador y no tiene campos de monto ni de tarjeta', async () => {
    const { el } = await setup();
    expect(el.textContent).toContain('Simulador de pagos');
    expect(el.textContent).toContain('no se cobra dinero real');
    expect(el.querySelectorAll('input').length).toBe(0);
  });

  it('ofrece los tres métodos y los cuatro escenarios más Otro token', async () => {
    const { el } = await setup();
    const labels = Array.from(el.querySelectorAll('app-select mat-label')).map((l) =>
      l.textContent?.trim(),
    );
    expect(labels).toEqual(['Método de pago', 'Escenario de prueba']);
  });

  it('por defecto emite Tarjeta con el escenario Aprobado', async () => {
    const { submit, host } = await setup();
    await submit();
    expect(host.values).toEqual([{ metodo: 'CARD', token: 'tok_test_approved' }]);
  });

  it('cada escenario envía su token', async () => {
    const { submit, host, form, settle } = await setup();
    const expected: Record<string, string> = {
      declined: 'tok_test_declined',
      error: 'tok_test_error',
      pending: 'tok_test_pending',
    };
    for (const [id, token] of Object.entries(expected)) {
      form.model.update((m) => ({ ...m, metodo: 'NEQUI', escenario: id }));
      await settle();
      await submit();
      expect(host.values.at(-1)).toEqual({ metodo: 'NEQUI', token });
    }
  });

  it('Otro token muestra un campo de texto y sin texto no se envía', async () => {
    const { el, submit, host, form, settle } = await setup();
    form.model.update((m) => ({ ...m, escenario: 'custom' }));
    await settle();
    expect(el.querySelectorAll('input').length).toBe(1);

    await submit();
    expect(host.values).toEqual([]);

    form.model.update((m) => ({ ...m, otroToken: '   ' }));
    await settle();
    await submit();
    expect(host.values).toEqual([]);
  });

  it('un token propio se envía tal cual (sin espacios de los bordes)', async () => {
    const { submit, host, form, settle } = await setup();
    form.model.set({ metodo: 'PSE', escenario: 'custom', otroToken: ' tok_raro ' });
    await settle();
    await submit();
    expect(host.values).toEqual([{ metodo: 'PSE', token: 'tok_raro' }]);
  });

  it('un token de más de 100 caracteres no se envía', async () => {
    const { submit, host, form, settle } = await setup();
    form.model.set({ metodo: 'CARD', escenario: 'custom', otroToken: 'a'.repeat(101) });
    await settle();
    await submit();
    expect(host.values).toEqual([]);
  });

  it('con busy el botón se deshabilita, dice "Procesando pago…" y el formulario es aria-busy', async () => {
    const { el, host, fixture, settle } = await setup();
    host.busy.set(true);
    await settle();
    fixture.detectChanges();
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Procesando pago…');
    expect(el.querySelector('form')?.getAttribute('aria-busy')).toBe('true');

    button.click();
    await settle();
    expect(host.values).toEqual([]);
  });
});
