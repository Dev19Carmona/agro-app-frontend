import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth';
import { SessionRefresher } from './core/auth';
import { clearLegacyDemoRole } from './core/navigation';
import { PageTitleStrategy } from './core/routing';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Restaura la sesión antes de la primera navegación, para que los guards sepan quién es.
    provideAppInitializer(() => {
      clearLegacyDemoRole();
      return inject(SessionRefresher).restore();
    }),
    // Cada navegación vuelve arriba (el scroll es el de la página, no el de un contenedor).
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    // document.title = «Título de la ruta · Mini-Croper».
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
