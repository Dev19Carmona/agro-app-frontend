import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthLayout } from './auth-layout';

@Component({ template: '<h1>Pantalla</h1>' })
class Page {}

describe('AuthLayout', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
  });

  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth', component: AuthLayout, children: [{ path: 'login', component: Page }] },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auth/login');
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('centra la pantalla en un main y no pinta header ni panel de navegación', async () => {
    const el = await setup();
    expect(el.querySelector('main#main-content h1')?.textContent).toBe('Pantalla');
    expect(el.querySelector('app-header')).toBeNull();
    expect(el.querySelector('aside')).toBeNull();
    expect(el.querySelector('nav')).toBeNull();
  });

  it('la marca enlaza al catálogo con nombre accesible', async () => {
    const el = await setup();
    const brand = el.querySelector('header a') as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/catalogo');
    expect(brand.getAttribute('aria-label')).toBe('Mini-Croper, ir al catálogo');
  });

  it('ofrece el selector de tema y este cambia el tema del documento', async () => {
    const el = await setup();
    const trigger = el.querySelector(
      'app-theme-menu button[aria-label="Tema"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve));
    const dark = Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]')).find((i) =>
      i.textContent?.includes('Oscuro'),
    ) as HTMLElement;
    dark.click();
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });
});
