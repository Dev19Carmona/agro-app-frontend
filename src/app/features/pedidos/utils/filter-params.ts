import { OrdersFilter } from '../models/pedidos.types';
import { isOrderStatus } from '../../../core/orders';

interface ParamReader {
  get(name: string): string | null;
}

/** Página de `?page=`: entero mayor o igual a 1; cualquier otro valor da 1. */
export function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Filtro de la URL: `status` solo acepta los cuatro valores y `page` un entero ≥ 1. */
export function parseOrdersFilter(params: ParamReader): OrdersFilter {
  const status = params.get('status');
  return {
    page: parsePage(params.get('page')),
    ...(isOrderStatus(status) ? { status } : {}),
  };
}

/** Query params de la URL para un filtro; los valores por defecto (todos, página 1) no se escriben. */
export function ordersFilterQuery(filter: OrdersFilter): Record<string, string> {
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.page > 1 ? { page: String(filter.page) } : {}),
  };
}
