import { PaymentsFilter } from '../models/pagos.types';
import { isPaymentStatus } from './payment-status';

interface ParamReader {
  get(name: string): string | null;
}

/** `true` si `value` es un ObjectId de Mongo (24 hexadecimales), como exige el backend. */
export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

/** Página de `?page=`: entero mayor o igual a 1; cualquier otro valor da 1. */
export function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Filtro de la URL: `status` solo los cinco valores, `orderId` solo 24 hex y `page` un entero ≥ 1. */
export function parsePaymentsFilter(params: ParamReader): PaymentsFilter {
  const status = params.get('status');
  const orderId = params.get('orderId');
  return {
    page: parsePage(params.get('page')),
    ...(isPaymentStatus(status) ? { status } : {}),
    ...(orderId !== null && isObjectId(orderId) ? { orderId } : {}),
  };
}

/** Query params de la URL para un filtro; los valores por defecto (todos, página 1) no se escriben. */
export function paymentsFilterQuery(filter: PaymentsFilter): Record<string, string> {
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.orderId ? { orderId: filter.orderId } : {}),
    ...(filter.page > 1 ? { page: String(filter.page) } : {}),
  };
}
