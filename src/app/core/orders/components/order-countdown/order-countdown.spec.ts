import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrderCountdown } from './order-countdown';

@Component({
  imports: [OrderCountdown],
  template: `<app-order-countdown [expiresAt]="expiresAt()" (expired)="expiredCount = expiredCount + 1" />`,
})
class Host {
  expiresAt = signal('');
  expiredCount = 0;
}

const START = Date.parse('2026-11-09T10:00:00.000Z');

function setup(remainingMs: number) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.expiresAt.set(new Date(START + remainingMs).toISOString());
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const tick = (ms: number) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  return {
    fixture,
    host: fixture.componentInstance,
    root,
    tick,
    timer: () => root.querySelector('[role="timer"]')?.textContent?.trim(),
    live: () => root.querySelector('[aria-live]')?.textContent?.trim(),
  };
}

describe('OrderCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  it('muestra mm:ss desde expiresAt y avanza cada segundo', () => {
    const { timer, tick } = setup(15 * 60_000);
    expect(timer()).toBe('15:00');
    tick(1000);
    expect(timer()).toBe('14:59');
    tick(59_000);
    expect(timer()).toBe('14:00');
  });

  it('es un role="timer" sin aria-live propio', () => {
    const { root } = setup(15 * 60_000);
    const timer = root.querySelector('[role="timer"]');
    expect(timer).not.toBeNull();
    expect(timer?.hasAttribute('aria-live')).toBe(false);
  });

  it('solo anuncia en hitos: nada al inicio, 5 minutos, 1 minuto y al vencer', () => {
    const { live, tick } = setup(6 * 60_000);
    expect(live()).toBe('');
    tick(61_000);
    expect(live()).toContain('cinco minutos');
    tick(4 * 60_000);
    expect(live()).toContain('menos de un minuto');
    tick(60_000);
    expect(live()).toContain('venció');
  });

  it('al llegar a 0 emite expired una sola vez', () => {
    const { host, timer, tick } = setup(2000);
    expect(host.expiredCount).toBe(0);
    tick(2000);
    expect(timer()).toBe('00:00');
    expect(host.expiredCount).toBe(1);
    tick(5000);
    expect(host.expiredCount).toBe(1);
  });

  it('si ya venció al mostrarse emite expired al instante', () => {
    const { host, timer } = setup(-5000);
    expect(timer()).toBe('00:00');
    expect(host.expiredCount).toBe(1);
  });

  it('un expiresAt nuevo vuelve a poder emitir expired', () => {
    const { host, fixture, tick } = setup(1000);
    tick(1000);
    expect(host.expiredCount).toBe(1);
    host.expiresAt.set(new Date(Date.now() + 1000).toISOString());
    fixture.detectChanges();
    tick(1000);
    expect(host.expiredCount).toBe(2);
  });

  it('al destruir el componente se detiene el reloj', () => {
    const { fixture } = setup(60_000);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
