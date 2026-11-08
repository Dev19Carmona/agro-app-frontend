import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../http';
import { toApiError } from '../../http';
import {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  Profile,
  RegisterRequest,
} from '../models/auth.types';

/**
 * Cliente de los endpoints `/auth/*`. Solo hace las peticiones: no toca la sesión.
 * Todos los errores salen como `ApiError`.
 */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/auth`;

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.request(this.http.post<LoginResponse>(`${this.base}/login`, body));
  }

  /** Crea la cuenta. No devuelve tokens: el usuario inicia sesión después. */
  register(body: RegisterRequest): Observable<AuthUser> {
    return this.request(this.http.post<AuthUser>(`${this.base}/register`, body));
  }

  refresh(refreshToken: string): Observable<LoginResponse> {
    return this.request(this.http.post<LoginResponse>(`${this.base}/refresh`, { refreshToken }));
  }

  logout(): Observable<void> {
    return this.request(this.http.post<void>(`${this.base}/logout`, null));
  }

  me(): Observable<Profile> {
    return this.request(this.http.get<Profile>(`${this.base}/me`));
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.request(this.http.post<void>(`${this.base}/change-password`, body));
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
