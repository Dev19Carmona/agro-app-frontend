import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Input } from './input';

@Component({
  imports: [Input, FormField],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Input (app-input)</h1>

      <section aria-labelledby="input-types" class="space-y-4">
        <h2 id="input-types" class="text-xl">Tipos</h2>
        <app-input label="Nombre" hint="Como aparece en tu documento" [(value)]="name" />
        <app-input label="Correo" type="email" placeholder="ana@correo.com" />
        <app-input
          label="Contraseña"
          type="password"
          hint="Usa el botón para mostrarla u ocultarla"
        />
        <app-input label="Teléfono" type="tel" />
      </section>

      <section aria-labelledby="input-states" class="space-y-4">
        <h2 id="input-states" class="text-xl">Estados</h2>
        <app-input label="Deshabilitado" [disabled]="true" value="No editable" />
        <app-input label="Solo lectura" [readonly]="true" value="Se puede enfocar y copiar" />
        <app-input
          label="Con error"
          [touched]="true"
          [errors]="[{ kind: 'required', message: 'Este campo es obligatorio' }]"
        />
      </section>

      <section aria-labelledby="input-signal" class="space-y-4">
        <h2 id="input-signal" class="text-xl">Con Signal Forms</h2>
        <p class="text-fg-muted">
          El error aparece al salir del campo vacío. Valor actual: <code>{{ model().email }}</code>
        </p>
        <app-input label="Correo" type="email" [formField]="f.email" />
      </section>
    </div>
  `,
})
export class InputDemo {
  protected readonly name = signal('Ana Pérez');
  protected readonly model = signal({ email: '' });
  protected readonly f = form(this.model, (path) => {
    required(path.email, { message: 'Escribe tu correo' });
  });
}
