import {
  NOTIFICATIONS_POLL_INTERVAL_MS as BASE,
  NOTIFICATIONS_POLL_MAX_INTERVAL_MS as MAX,
} from '../models/notifications.types';
import { nextPollInterval, shouldBackOff } from './poll-interval';

describe('shouldBackOff', () => {
  it('solo 429 y 503 piden espera creciente', () => {
    expect(shouldBackOff(429)).toBe(true);
    expect(shouldBackOff(503)).toBe(true);
    expect(shouldBackOff(0)).toBe(false);
    expect(shouldBackOff(500)).toBe(false);
    expect(shouldBackOff(401)).toBe(false);
  });
});

describe('nextPollInterval', () => {
  it('duplica la espera ante un fallo', () => {
    expect(nextPollInterval(BASE, 'backoff')).toBe(BASE * 2);
    expect(nextPollInterval(BASE * 2, 'backoff')).toBe(BASE * 4);
  });

  it('no pasa del tope de 5 minutos', () => {
    expect(MAX).toBe(300_000);
    let delay = BASE;
    for (let i = 0; i < 10; i++) {
      delay = nextPollInterval(delay, 'backoff');
    }
    expect(delay).toBe(MAX);
  });

  it('vuelve al intervalo base tras un éxito', () => {
    expect(nextPollInterval(MAX, 'ok')).toBe(BASE);
  });
});
