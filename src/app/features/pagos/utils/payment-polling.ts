import type { ApiError } from '../../../core/http';
import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_MAX_MS, Payment } from '../models/pagos.types';
import type { PagosApi } from '../services/pagos-api';
import { isPaymentSettled } from './payment-status';
import { nextPollInterval, withinPollWindow } from './poll';

/**
 * Sondea `GET /payments/:id` mientras el pago no sea terminal: cada 8 segundos, el doble ante un
 * `429` (hasta 30 s), y se detiene al cambiar de estado o a los 2 minutos (`onTimeout`). Un fallo
 * no detiene el sondeo ni borra lo ya mostrado. Devuelve la función que lo cancela.
 */
export function startPaymentPolling(
  api: Pick<PagosApi, 'getPayment'>,
  id: string,
  onPayment: (payment: Payment) => void,
  onTimeout: () => void,
): () => void {
  const started = Date.now();
  let interval = PAYMENT_POLL_INTERVAL_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: { unsubscribe(): void } | undefined;

  const next = () => {
    if (!withinPollWindow(Date.now() - started, PAYMENT_POLL_MAX_MS)) {
      onTimeout();
      return;
    }
    timer = setTimeout(tick, interval);
  };
  const tick = () => {
    request = api.getPayment(id).subscribe({
      next: (payment) => {
        interval = nextPollInterval(interval, false);
        onPayment(payment);
        if (!isPaymentSettled(payment.status)) {
          next();
        }
      },
      error: (error: ApiError) => {
        interval = nextPollInterval(interval, error.status === 429);
        next();
      },
    });
  };

  timer = setTimeout(tick, interval);
  return () => {
    clearTimeout(timer);
    request?.unsubscribe();
  };
}
