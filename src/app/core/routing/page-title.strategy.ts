import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_NAME = 'Mini-Croper';

/** Pone `document.title` como «Título de la ruta · Mini-Croper». Sin título, solo el nombre. */
@Service({ autoProvided: false })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.title.setTitle(routeTitle ? `${routeTitle} · ${APP_NAME}` : APP_NAME);
  }
}
