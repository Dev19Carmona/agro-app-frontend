import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrderStatus } from '../../models/pedidos.types';
import { OrderStatusBadge } from './order-status-badge';

@Component({
  imports: [OrderStatusBadge],
  template: `<app-order-status-badge [status]="status" />`,
})
class Host {
  status: OrderStatus = 'PENDING';
}

function render(status: OrderStatus) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.status = status;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OrderStatusBadge', () => {
  it.each([
    ['PENDING', 'Pendiente'],
    ['AWAITING_PAYMENT', 'Esperando pago'],
    ['CONFIRMED', 'Confirmado'],
    ['CANCELLED', 'Cancelado'],
  ] as const)('%s muestra "%s" en texto', (status, label) => {
    expect(render(status).textContent?.trim()).toBe(label);
  });

  it('cada estado usa una variante distinta de badge', () => {
    const classes = (['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED'] as const).map(
      (status) => render(status).querySelector('app-badge')?.className,
    );
    TestBed.resetTestingModule();
    expect(new Set(classes).size).toBe(4);
  });
});
