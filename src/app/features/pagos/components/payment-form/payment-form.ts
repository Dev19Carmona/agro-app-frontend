import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { CUSTOM_TOKEN_ID, DEFAULT_SCENARIO_ID, TEST_SCENARIOS } from '../../config/test-scenarios';
import { CUSTOM_TOKEN_MAX_LENGTH } from '../../models/pagos.types';
import { PaymentMethod } from '../../../../core/payments';

/** Método y token elegidos al enviar el formulario. */
export interface PaymentFormValue {
  metodo: PaymentMethod;
  token: string;
}

const METHOD_OPTIONS: readonly SelectOption[] = [
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'PSE', label: 'PSE' },
  { value: 'NEQUI', label: 'Nequi' },
];

const SCENARIO_OPTIONS: readonly SelectOption[] = [
  ...TEST_SCENARIOS.map((s) => ({ value: s.id, label: s.label })),
  { value: CUSTOM_TOKEN_ID, label: 'Otro token' },
];

/**
 * Formulario del simulador de pagos: método y escenario de prueba (o un token propio). No tiene
 * monto ni datos de tarjeta: el monto lo toma el backend del pedido. Emite `submitted` con un
 * formulario válido; mientras `busy` está activo el botón queda deshabilitado y el formulario
 * se marca con `aria-busy`.
 */
@Component({
  selector: 'app-payment-form',
  imports: [FormRoot, FormField, Select, Input, Button, Alert],
  template: `
    <form [formRoot]="f" class="space-y-4" [attr.aria-busy]="busy() ? 'true' : null">
      <app-alert variant="info" title="Simulador de pagos">
        Esto es una pasarela de prueba: no se cobra dinero real ni se piden datos de tarjeta. Elige
        el resultado que quieres simular.
      </app-alert>

      <app-select label="Método de pago" [options]="methodOptions" [formField]="f.metodo" />
      <app-select
        label="Escenario de prueba"
        [options]="scenarioOptions"
        [hint]="scenarioHint()"
        [formField]="f.escenario"
      />
      @if (isCustom()) {
        <app-input
          label="Token de prueba"
          autocomplete="off"
          hint="Se envía tal cual a la pasarela; uno desconocido se rechaza."
          [formField]="f.otroToken"
        />
      }

      <div class="flex flex-wrap items-center gap-3">
        <button app-button type="submit" size="lg" [disabled]="busy()">
          {{ busy() ? 'Procesando pago…' : 'Pagar' }}
        </button>
        @if (busy()) {
          <span class="text-fg-muted" role="status">Procesando pago…</span>
        }
      </div>
    </form>
  `,
  host: { class: 'block' },
})
export class PaymentForm {
  /** Hay un envío en curso: el botón Pagar queda deshabilitado. */
  readonly busy = input(false);
  readonly submitted = output<PaymentFormValue>();

  protected readonly methodOptions = METHOD_OPTIONS;
  protected readonly scenarioOptions = SCENARIO_OPTIONS;

  protected readonly model = signal({
    metodo: 'CARD',
    escenario: DEFAULT_SCENARIO_ID,
    otroToken: '',
  });

  protected readonly f = form(
    this.model,
    (path) => {
      required(path.metodo, { message: 'Elige un método de pago' });
      required(path.escenario, { message: 'Elige un escenario de prueba' });
      validate(path.otroToken, ({ value, valueOf }) =>
        valueOf(path.escenario) === CUSTOM_TOKEN_ID && value().trim() === ''
          ? { kind: 'required', message: 'Escribe el token de prueba' }
          : null,
      );
      maxLength(path.otroToken, CUSTOM_TOKEN_MAX_LENGTH, {
        message: `Máximo ${CUSTOM_TOKEN_MAX_LENGTH} caracteres`,
      });
    },
    {
      submission: {
        action: async () => this.emit(),
        onInvalid: (field) => field().focusBoundControl(),
      },
    },
  );

  protected readonly isCustom = computed(() => this.model().escenario === CUSTOM_TOKEN_ID);
  protected readonly scenarioHint = computed(
    () => TEST_SCENARIOS.find((s) => s.id === this.model().escenario)?.hint ?? null,
  );

  private emit(): undefined {
    if (this.busy()) {
      return;
    }
    const { metodo, escenario, otroToken } = this.model();
    const token =
      escenario === CUSTOM_TOKEN_ID
        ? otroToken.trim()
        : (TEST_SCENARIOS.find((s) => s.id === escenario)?.token ?? '');
    if (!token) {
      return;
    }
    this.submitted.emit({ metodo: metodo as PaymentMethod, token });
  }
}
