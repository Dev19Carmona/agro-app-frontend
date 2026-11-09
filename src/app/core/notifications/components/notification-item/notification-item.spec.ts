import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AppNotification } from '../../models/notifications.types';
import { NotificationItem } from './notification-item';

const BASE: AppNotification = {
  id: 'a',
  plantilla: 'PAYMENT_APPROVED',
  destinatarioTipo: 'USER',
  titulo: 'Pago aprobado',
  mensaje: 'El pago del pedido 64f0c0a1b2c3d4e5f6a7b8c9 fue aprobado',
  orderId: '64f0c0a1b2c3d4e5f6a7b8c9',
  sentAt: '2026-11-09T15:30:00.000Z',
  readAt: null,
};

@Component({
  imports: [NotificationItem],
  template: `<app-notification-item
    [notification]="notification()"
    (select)="selected.push($event)"
  />`,
})
class Host {
  notification = signal<AppNotification>(BASE);
  selected: AppNotification[] = [];
}

function setup(patch: Partial<AppNotification> = {}) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.notification.set({ ...BASE, ...patch });
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, button: el.querySelector('button') as HTMLButtonElement };
}

describe('NotificationItem', () => {
  it('muestra título, mensaje y fecha', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Pago aprobado');
    expect(el.textContent).toContain('64f0c0a1b2c3d4e5f6a7b8c9');
    expect(el.textContent).toMatch(/2026/);
  });

  it('un aviso sin leer lleva punto, texto «Sin leer» y título en negrita', () => {
    const { el } = setup();
    expect(el.querySelector('.sr-only')?.textContent).toBe('Sin leer');
    expect(el.querySelector('.font-semibold')?.textContent).toContain('Pago aprobado');
  });

  it('un aviso leído no tiene punto ni negrita', () => {
    const { el } = setup({ readAt: '2026-11-09T16:00:00.000Z' });
    expect(el.querySelector('.sr-only')).toBeNull();
    expect(el.querySelector('.font-semibold')).toBeNull();
  });

  it('usa el icono y el tono de la plantilla', () => {
    const { el } = setup({ plantilla: 'PAYMENT_DECLINED' });
    expect(el.querySelector('.text-danger')).not.toBeNull();
    expect(el.querySelector('app-icon svg')).not.toBeNull();
  });

  it('muestra título y mensaje como texto, no como HTML', () => {
    const { el } = setup({ titulo: '<img src=x onerror=alert(1)>', mensaje: '<b>hola</b>' });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('b')).toBeNull();
    expect(el.textContent).toContain('<b>hola</b>');
  });

  it('el mensaje se parte con break-words para no desbordar a 360 px', () => {
    const { el } = setup();
    expect(el.innerHTML).toContain('wrap-break-word');
  });

  it('emite select con el aviso al pulsarlo', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.selected).toEqual([{ ...BASE }]);
  });
});
