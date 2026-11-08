import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth-api';
import { SessionService } from './session';

/**
 * Cierra la sesión: avisa al backend (`POST /auth/logout`) y borra la sesión local aunque la
 * llamada falle. La intención del usuario manda; el refresh token caduca solo.
 */
@Service()
export class LogoutService {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // Sin red o con la sesión ya caducada: igualmente se cierra en local.
    } finally {
      this.session.clear();
    }
    await this.router.navigateByUrl('/catalogo');
  }
}
