import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { formatCop } from '../../../../core/catalog';
import { Payment } from '../../models/pagos.types';
import { PaymentSummary } from './payment-summary';

const PAYMENT: Payment = {
  id: 'p1',
  orderId: 'o1',
  monto: 125000,
  moneda: 'COP',
  metodo: 'NEQUI',
  status: 'DECLINED',
  referencia: 'SIM-123',
  motivoRechazo: 'INSUFFICIENT_FUNDS',
  createdAt: '2026-11-09T15:30:00.000Z',
};

@Component({
  imports: [PaymentSummary],
  template: `<app-payment-summary [payment]="payment" />`,
})
class Host {
  payment: Payment = PAYMENT;
}

function render(payment: Payment) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.payment = payment;
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('PaymentSummary', () => {
  it('muestra estado, monto con formatCop, método, referencia, motivo y fecha', () => {
    const text = render(PAYMENT);
    expect(text).toContain('Rechazado');
    expect(text).toContain(formatCop(125000).replace(/\s/g, ' '));
    expect(text).toContain('Nequi');
    expect(text).toContain('SIM-123');
    expect(text).toContain('Fondos insuficientes');
    expect(text).toContain('2026');
  });

  it('sin referencia ni motivo no muestra esas filas', () => {
    const text = render({
      ...PAYMENT,
      status: 'PROCESSING',
      referencia: undefined,
      motivoRechazo: undefined,
    });
    expect(text).not.toContain('Referencia');
    expect(text).not.toContain('Motivo');
  });
});
