import type { UserStatus } from '../../../core/auth';
import { SESSION_ROLE_LABELS } from '../../../core/navigation';
import type { BadgeTone } from '../../../shared/ui/badge/badge.types';
import { UserRole } from '../models/admin.types';

export const USER_STATUSES: readonly UserStatus[] = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'DISABLED',
];

export const USER_ROLES: readonly UserRole[] = ['PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING_APPROVAL: 'Pendiente de aprobación',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazado',
  DISABLED: 'Deshabilitado',
};

const STATUS_TONES: Record<UserStatus, BadgeTone> = {
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'success',
  REJECTED: 'danger',
  DISABLED: 'neutral',
};

export function userStatusLabel(status: UserStatus): string {
  return STATUS_LABELS[status];
}

export function userStatusTone(status: UserStatus): BadgeTone {
  return STATUS_TONES[status];
}

export function userRoleLabel(role: UserRole): string {
  return SESSION_ROLE_LABELS[role];
}

export function isUserStatus(value: string | null): value is UserStatus {
  return value !== null && (USER_STATUSES as readonly string[]).includes(value);
}

export function isUserRole(value: string | null): value is UserRole {
  return value !== null && (USER_ROLES as readonly string[]).includes(value);
}
