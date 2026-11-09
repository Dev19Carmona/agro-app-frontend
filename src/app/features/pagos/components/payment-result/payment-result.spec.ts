import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Payment, PaymentStatus } from '../../models/pagos.types';
import { PaymentResult } from './payment-result';

function payment(status: PaymentStatus, extra: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    orderId: 'o1',
    monto: 5000,
    moneda: 'COP',
    metodo: 'CARD',
    status,
    createdAt: '2026-11-09T10:00:00.000Z',
    ...extra,
  };
}

@Component({
  imports: [PaymentResult],
  template: `<app-payment-result [payment]="payment"
    ><a href="/x">siguiente</a></app-payment-result
  >`,
})
class Host {
  payment: Payment = payment('APPROVED');
}

async function render(value: Payment) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.payment = value;
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { el, alert: el.querySelector('app-alert') as HTMLElement };
}

describe('PaymentResult', () => {
  it('aprobado: "Pago aprobado" con la referencia, anunciado con role=status', async () => {
    const { alert } = await render(payment('APPROVED', { referencia: 'SIM-1' }));
    expect(alert.textContent).toContain('Pago aprobado');
    expect(alert.textContent).toContain('SIM-1');
    expect(alert.getAttribute('role')).toBe('status');
  });

  it('rechazado: muestra "Fondos insuficientes" con role=alert', async () => {
    const { alert } = await render(payment('DECLINED', { motivoRechazo: 'INSUFFICIENT_FUNDS' }));
    expect(alert.textContent).toContain('Pago rechazado');
    expect(alert.textContent).toContain('Fondos insuficientes');
    expect(alert.getAttribute('role')).toBe('alert');
  });

  it('un motivo desconocido se muestra tal cual', async () => {
    const { alert } = await render(payment('DECLINED', { motivoRechazo: 'MOTIVO_NUEVO' }));
    expect(alert.textContent).toContain('MOTIVO_NUEVO');
  });

  it('error de pasarela: mensaje de reintento con role=alert', async () => {
    const { alert } = await render(payment('ERROR', { motivoRechazo: 'GATEWAY_ERROR' }));
    expect(alert.textContent).toContain('No se pudo completar el pago');
    expect(alert.textContent).toContain('Falla de la pasarela, intenta de nuevo');
    expect(alert.getAttribute('role')).toBe('alert');
  });

  it.each(['PROCESSING', 'PENDING'] as const)('%s: "Pago en proceso"', async (status) => {
    const { alert } = await render(payment(status));
    expect(alert.textContent).toContain('Pago en proceso');
    expect(alert.getAttribute('role')).toBe('status');
  });

  it('proyecta el contenido y recibe el foco al aparecer', async () => {
    const { el } = await render(payment('APPROVED'));
    expect(el.querySelector('a')?.textContent).toBe('siguiente');
    const host = el.querySelector('app-payment-result') as HTMLElement;
    expect(host.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(host);
  });
});
