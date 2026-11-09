import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaymentStatus } from '../../models/payments.types';
import { PaymentStatusBadge } from './payment-status-badge';

@Component({
  imports: [PaymentStatusBadge],
  template: `<app-payment-status-badge [status]="status" />`,
})
class Host {
  status: PaymentStatus = 'PENDING';
}

function render(status: PaymentStatus) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.status = status;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PaymentStatusBadge', () => {
  it.each([
    ['PENDING', 'Pendiente'],
    ['PROCESSING', 'En proceso'],
    ['APPROVED', 'Aprobado'],
    ['DECLINED', 'Rechazado'],
    ['ERROR', 'Con error'],
  ] as const)('%s muestra "%s" en texto', (status, label) => {
    expect(render(status).textContent?.trim()).toBe(label);
  });

  it('cada estado usa una variante distinta de badge', () => {
    const classes = (['PENDING', 'PROCESSING', 'APPROVED', 'DECLINED', 'ERROR'] as const).map(
      (status) => render(status).querySelector('app-badge')?.className,
    );
    TestBed.resetTestingModule();
    expect(new Set(classes).size).toBe(5);
  });
});
