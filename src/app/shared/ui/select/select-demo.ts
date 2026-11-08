import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Select } from './select';
import { SelectOption } from './select.types';

@Component({
  imports: [Select, FormField],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Select (app-select)</h1>

      <section aria-labelledby="select-basic" class="space-y-4">
        <h2 id="select-basic" class="text-xl">Básico</h2>
        <app-select
          label="Rol"
          placeholder="Elige un rol"
          hint="Un proveedor necesita aprobación"
          [options]="roles"
          [(value)]="role"
        />
        <p class="text-fg-muted">
          Valor: <code>{{ role() || '(vacío)' }}</code>
        </p>
      </section>

      <section aria-labelledby="select-states" class="space-y-4">
        <h2 id="select-states" class="text-xl">Estados</h2>
        <app-select label="Deshabilitado" [options]="roles" [disabled]="true" value="PRODUCTOR" />
        <app-select
          label="Con una opción deshabilitada"
          [options]="withDisabled"
          placeholder="Elige"
        />
        <app-select
          label="Con error"
          [options]="roles"
          [touched]="true"
          [errors]="[{ kind: 'required', message: 'Elige un rol' }]"
        />
      </section>

      <section aria-labelledby="select-signal" class="space-y-4">
        <h2 id="select-signal" class="text-xl">Con Signal Forms</h2>
        <app-select label="Rol" placeholder="Elige un rol" [options]="roles" [formField]="f.rol" />
        <p class="text-fg-muted">
          Valor: <code>{{ model().rol || '(vacío)' }}</code>
        </p>
      </section>
    </div>
  `,
})
export class SelectDemo {
  protected readonly roles: SelectOption[] = [
    { value: 'PRODUCTOR', label: 'Productor' },
    { value: 'PROVEEDOR', label: 'Proveedor' },
  ];
  protected readonly withDisabled: SelectOption[] = [
    { value: 'a', label: 'Disponible' },
    { value: 'b', label: 'No disponible', disabled: true },
  ];
  protected readonly role = signal('');
  protected readonly model = signal({ rol: '' });
  protected readonly f = form(this.model, (path) => {
    required(path.rol, { message: 'Elige un rol' });
  });
}
