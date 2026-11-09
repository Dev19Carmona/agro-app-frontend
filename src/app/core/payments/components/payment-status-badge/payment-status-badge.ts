import { Component, computed, input } from '@angular/core';
import { Badge } from '../../../../shared/ui/badge/badge';
import { PaymentStatus } from '../../models/payments.types';
import { paymentStatusLabel, paymentStatusTone } from '../../utils/payment-status';

/** Estado de un pago como badge: el significado va en el texto y el color solo lo refuerza. */
@Component({
  selector: 'app-payment-status-badge',
  imports: [Badge],
  template: `<app-badge [tone]="tone()">{{ label() }}</app-badge>`,
  host: { class: 'inline-flex' },
})
export class PaymentStatusBadge {
  readonly status = input.required<PaymentStatus>();

  protected readonly label = computed(() => paymentStatusLabel(this.status()));
  protected readonly tone = computed(() => paymentStatusTone(this.status()));
}
