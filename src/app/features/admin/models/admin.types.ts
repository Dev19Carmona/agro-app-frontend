import type { AppRole, UserStatus } from '../../../core/auth';
import type { OrderStatus, OrderSummary } from '../../../core/orders';
import type { Payment, PaymentStatus } from '../../../core/payments';

/** Rol de una cuenta (el visitante no tiene cuenta). */
export type UserRole = AppRole;

/** Vista de administración de un usuario (espejo del backend). */
export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  /** Solo se muestra en el detalle del usuario, nunca en la lista. */
  documento: string;
  rol: UserRole;
  status: UserStatus;
  storeId?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  /** ISO. */
  reviewedAt?: string;
  /** ISO. */
  createdAt: string;
}
export interface UsersFilter {
  rol?: UserRole;
  status?: UserStatus;
  page: number;
}

export interface AdminCategory {
  id: string;
  nombre: string;
  activa: boolean;
}
export interface UpdateCategoryRequest {
  nombre?: string;
  activa?: boolean;
}

export interface StoresFilter {
  municipio?: string;
  page: number;
}
export interface UpdateStoreRequest {
  nombre?: string;
  nit?: string;
  municipio?: string;
}

export interface AdminOrderSummary extends OrderSummary {
  buyerId: string;
}
export interface AdminOrdersFilter {
  status?: OrderStatus;
  buyerId?: string;
  page: number;
}

export interface PaymentAttempt {
  /** Se muestra tal cual. */
  origen: string;
  resultado: string;
  motivo?: string;
  /** ISO. */
  createdAt: string;
}
export interface AdminPayment extends Payment {
  buyerId: string;
}
export interface AdminPaymentDetail extends AdminPayment {
  attempts: PaymentAttempt[];
}
export interface AdminPaymentsFilter {
  status?: PaymentStatus;
  buyerId?: string;
  orderId?: string;
  page: number;
}

export const ADMIN_PAGE_SIZE = 10;
export const REJECT_REASON_MAX_LENGTH = 500;
export const CATEGORY_NAME_MAX_LENGTH = 100;
export const MUNICIPIO_MAX_LENGTH = 100;
