import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaymentAttempt } from '../../models/admin.types';
import { AttemptsTable } from './attempts-table';

const ATTEMPTS: PaymentAttempt[] = [
  {
    origen: 'CLIENT',
    resultado: 'DECLINED',
    motivo: 'INSUFFICIENT_FUNDS',
    createdAt: '2026-11-09T10:00:00.000Z',
  },
  { origen: 'WEBHOOK', resultado: 'APPROVED', createdAt: '2026-11-09T10:05:00.000Z' },
];

@Component({ imports: [AttemptsTable], template: `<app-attempts-table [attempts]="attempts" />` })
class Host {
  attempts = ATTEMPTS;
}

describe('AttemptsTable', () => {
  it('muestra origen, resultado y motivo de cada intento', () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const text = f.nativeElement.textContent as string;
    expect(text).toContain('CLIENT');
    expect(text).toContain('DECLINED');
    expect(text).toContain('INSUFFICIENT_FUNDS');
    expect(text).toContain('WEBHOOK');
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('un intento sin motivo muestra un guion', () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const rows = f.nativeElement.querySelectorAll('tbody tr');
    expect(rows[1].textContent).toContain('—');
  });
});
