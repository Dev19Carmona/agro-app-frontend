import { Component, computed, input } from '@angular/core';
import { formatCop } from '../../../../core/catalog';
import { Payment } from '../../models/pagos.types';
import { formatDateTime } from '../../utils/format-date';
import { paymentMethodLabel, rejectionMessage } from '../../utils/payment-status';
import { PaymentStatusBadge } from '../payment-status-badge/payment-status-badge';

/** Datos de un pago: estado, monto, método, referencia, motivo de rechazo y fecha. */
@Component({
  selector: 'app-payment-summary',
  imports: [PaymentStatusBadge],
  template: `
    <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
      <dt class="text-fg-muted">Estado</dt>
      <dd><app-payment-status-badge [status]="payment().status" /></dd>

      <dt class="text-fg-muted">Monto</dt>
      <dd class="font-semibold">{{ amount() }}</dd>

      <dt class="text-fg-muted">Método</dt>
      <dd>{{ method() }}</dd>

      @if (payment().referencia) {
        <dt class="text-fg-muted">Referencia</dt>
        <dd class="font-mono break-all">{{ payment().referencia }}</dd>
      }

      @if (reason(); as text) {
        <dt class="text-fg-muted">Motivo</dt>
        <dd>{{ text }}</dd>
      }

      <dt class="text-fg-muted">Fecha</dt>
      <dd>{{ date() }}</dd>
    </dl>
  `,
  host: { class: 'block' },
})
export class PaymentSummary {
  readonly payment = input.required<Payment>();

  protected readonly amount = computed(() => formatCop(this.payment().monto));
  protected readonly method = computed(() => paymentMethodLabel(this.payment().metodo));
  protected readonly reason = computed(() => rejectionMessage(this.payment().motivoRechazo));
  protected readonly date = computed(() => formatDateTime(this.payment().createdAt));
}
