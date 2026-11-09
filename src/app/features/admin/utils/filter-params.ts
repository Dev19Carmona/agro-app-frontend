import { isOrderStatus } from '../../../core/orders';
import { isPaymentStatus } from '../../../core/payments';
import {
  AdminOrdersFilter,
  AdminPaymentsFilter,
  MUNICIPIO_MAX_LENGTH,
  StoresFilter,
  UsersFilter,
} from '../models/admin.types';
import { isUserRole, isUserStatus } from './user-labels';

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

/** `?municipio=`: se recorta y se limita a 100 caracteres; vacío se ignora. */
export function parseMunicipio(value: string | null): string | undefined {
  const trimmed = value?.trim().slice(0, MUNICIPIO_MAX_LENGTH).trim();
  return trimmed ? trimmed : undefined;
}

function objectIdParam(value: string | null): string | undefined {
  return value !== null && isObjectId(value) ? value : undefined;
}

export function parseUsersFilter(params: ParamReader): UsersFilter {
  const rol = params.get('rol');
  const status = params.get('status');
  return {
    page: parsePage(params.get('page')),
    ...(isUserRole(rol) ? { rol } : {}),
    ...(isUserStatus(status) ? { status } : {}),
  };
}

export function parseStoresFilter(params: ParamReader): StoresFilter {
  const municipio = parseMunicipio(params.get('municipio'));
  return { page: parsePage(params.get('page')), ...(municipio ? { municipio } : {}) };
}

export function parseOrdersFilter(params: ParamReader): AdminOrdersFilter {
  const status = params.get('status');
  const buyerId = objectIdParam(params.get('buyerId'));
  return {
    page: parsePage(params.get('page')),
    ...(isOrderStatus(status) ? { status } : {}),
    ...(buyerId ? { buyerId } : {}),
  };
}

export function parsePaymentsFilter(params: ParamReader): AdminPaymentsFilter {
  const status = params.get('status');
  const buyerId = objectIdParam(params.get('buyerId'));
  const orderId = objectIdParam(params.get('orderId'));
  return {
    page: parsePage(params.get('page')),
    ...(isPaymentStatus(status) ? { status } : {}),
    ...(buyerId ? { buyerId } : {}),
    ...(orderId ? { orderId } : {}),
  };
}

/** Query params de la URL para un filtro; los valores por defecto (todos, página 1) no se escriben. */
export function filterQuery(
  filter: UsersFilter | StoresFilter | AdminOrdersFilter | AdminPaymentsFilter,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key === 'page') {
      if (typeof value === 'number' && value > 1) {
        query['page'] = String(value);
      }
    } else if (typeof value === 'string' && value) {
      query[key] = value;
    }
  }
  return query;
}
