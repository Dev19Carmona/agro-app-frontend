/** Roles de negocio del backend. */
export type AppRole = 'PRODUCTOR' | 'PROVEEDOR' | 'ADMIN';

/** Rol efectivo de la sesión. `VISITANTE` es quien no ha iniciado sesión. */
export type SessionRole = 'VISITANTE' | AppRole;

export type UserStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: AppRole;
  status: UserStatus;
}

export interface Profile extends AuthUser {
  storeId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Segundos hasta que vence el access token. */
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  documento: string;
  rol: 'PRODUCTOR' | 'PROVEEDOR';
  aceptaTratamientoDatos: true;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** `restoring`: arrancando, aún no se sabe si hay sesión. */
export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated';

/** Clave de `localStorage` donde se guarda el refresh token. */
export const REFRESH_TOKEN_STORAGE_KEY = 'agro:refresh-token';
