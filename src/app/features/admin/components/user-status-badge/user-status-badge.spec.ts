import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { UserStatus } from '../../../../core/auth';
import { UserStatusBadge } from './user-status-badge';

@Component({
  imports: [UserStatusBadge],
  template: `<app-user-status-badge [status]="status" />`,
})
class Host {
  status: UserStatus = 'PENDING_APPROVAL';
}

describe('UserStatusBadge', () => {
  it.each([
    ['PENDING_APPROVAL', 'Pendiente de aprobación'],
    ['ACTIVE', 'Activo'],
    ['REJECTED', 'Rechazado'],
    ['DISABLED', 'Deshabilitado'],
  ] as const)('muestra el texto de %s', (status, text) => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.status = status;
    f.detectChanges();
    expect(f.nativeElement.textContent.trim()).toBe(text);
  });
});
