import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { PageTitleStrategy } from './core/routing/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Cada navegación vuelve arriba (el scroll es el de la página, no el de un contenedor).
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    // document.title = «Título de la ruta · Mini-Croper».
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
