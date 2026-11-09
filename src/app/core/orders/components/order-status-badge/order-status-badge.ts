import { Component, computed, input } from '@angular/core';
import { Badge } from '../../../../shared/ui/badge/badge';
import { OrderStatus } from '../../models/orders.types';
import { orderStatusLabel, orderStatusTone } from '../../utils/order-status';

/** Estado de un pedido como badge: el significado va en el texto y el color solo lo refuerza. */
@Component({
  selector: 'app-order-status-badge',
  imports: [Badge],
  template: `<app-badge [tone]="tone()">{{ label() }}</app-badge>`,
  host: { class: 'inline-flex' },
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();

  protected readonly label = computed(() => orderStatusLabel(this.status()));
  protected readonly tone = computed(() => orderStatusTone(this.status()));
}
