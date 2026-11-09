import type { NotificationTemplate } from '../models/notifications.types';
import {
  NOTIFICATION_TONE_CLASSES,
  formatNotificationDate,
  notificationPresentation,
  unreadBadgeText,
} from './notification-presentation';

describe('notificationPresentation', () => {
  const cases: [NotificationTemplate, string, string][] = [
    ['PAYMENT_APPROVED', 'credit-card', 'brand'],
    ['PAYMENT_DECLINED', 'credit-card', 'danger'],
    ['ORDER_CONFIRMED_BUYER', 'receipt', 'brand'],
    ['ORDER_CONFIRMED_STORE', 'store', 'brand'],
    ['ORDER_CANCELLED', 'receipt', 'warning'],
    ['PROVIDER_APPROVED', 'check', 'brand'],
    ['PROVIDER_REJECTED', 'alert', 'danger'],
    ['USER_REGISTERED', 'user', 'info'],
  ];

  it.each(cases)('%s usa el icono %s y el tono %s', (template, icon, tone) => {
    expect(notificationPresentation(template)).toEqual({ icon, tone });
  });

  it('cubre las ocho plantillas', () => {
    expect(cases.length).toBe(8);
  });

  it('una plantilla desconocida usa la campana', () => {
    expect(notificationPresentation('OTRA')).toEqual({ icon: 'bell', tone: 'info' });
  });

  it('cada tono tiene una clase de color del tema', () => {
    expect(Object.keys(NOTIFICATION_TONE_CLASSES).sort()).toEqual([
      'brand',
      'danger',
      'info',
      'warning',
    ]);
  });
});

describe('unreadBadgeText', () => {
  it.each([
    [0, '0'],
    [5, '5'],
    [99, '99'],
    [100, '99+'],
    [250, '99+'],
  ])('%d se muestra como %s', (count, text) => {
    expect(unreadBadgeText(count)).toBe(text);
  });
});

describe('formatNotificationDate', () => {
  it('da fecha y hora legibles', () => {
    expect(formatNotificationDate('2026-11-09T15:30:00.000Z')).toMatch(/2026/);
  });

  it('un valor no válido da cadena vacía', () => {
    expect(formatNotificationDate('no es fecha')).toBe('');
  });
});
