import { Component, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { Checkbox } from './checkbox';

@Component({
  imports: [Checkbox, FormField],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Checkbox (app-checkbox)</h1>

      <section aria-labelledby="checkbox-basic" class="space-y-3">
        <h2 id="checkbox-basic" class="text-xl">Básico</h2>
        <app-checkbox [(checked)]="news" hint="Un correo al mes, sin spam">
          Quiero recibir novedades
        </app-checkbox>
        <p class="text-fg-muted">
          Marcado: <code>{{ news() }}</code>
        </p>
      </section>

      <section aria-labelledby="checkbox-states" class="space-y-3">
        <h2 id="checkbox-states" class="text-xl">Estados</h2>
        <app-checkbox [disabled]="true">Deshabilitado</app-checkbox>
        <app-checkbox [disabled]="true" [checked]="true">Deshabilitado y marcado</app-checkbox>
        <app-checkbox
          [touched]="true"
          [errors]="[{ kind: 'required', message: 'Debes aceptar para continuar' }]"
        >
          Con error
        </app-checkbox>
      </section>

      <section aria-labelledby="checkbox-signal" class="space-y-3">
        <h2 id="checkbox-signal" class="text-xl">Con Signal Forms</h2>
        <app-checkbox [formField]="f.acepta">
          Acepto el tratamiento de mis datos personales
        </app-checkbox>
        <p class="text-fg-muted">
          Marcado: <code>{{ model().acepta }}</code>
        </p>
      </section>
    </div>
  `,
})
export class CheckboxDemo {
  protected readonly news = signal(false);
  protected readonly model = signal({ acepta: false });
  protected readonly f = form(this.model, (path) => {
    validate(path.acepta, ({ value }) =>
      value() ? null : { kind: 'required', message: 'Debes aceptar para continuar' },
    );
  });
}
