import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DemoRoleService } from '../navigation/demo-role';
import { ThemeService } from '../theme/theme';
import { AppShell } from './app-shell';

@Component({ template: 'página' })
class Page {}

const ROUTES = [
  { path: 'catalogo', component: Page },
  { path: 'catalogo/ofertas', component: Page },
  { path: 'catalogo/tiendas', component: Page },
  { path: 'auth/login', component: Page },
  { path: 'cuenta', component: Page },
  { path: 'pedidos', component: Page },
];

const settle = (f: ComponentFixture<unknown>) => async () => {
  f.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  f.detectChanges();
  await f.whenStable();
};

async function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  const fixture = TestBed.createComponent(AppShell);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    router: TestBed.inject(Router),
    role: TestBed.inject(DemoRoleService),
    theme: TestBed.inject(ThemeService),
    flush: settle(fixture),
    asideLinks: () =>
      Array.from(el.querySelectorAll<HTMLAnchorElement>('aside nav a')).map((a) =>
        a.textContent?.trim(),
      ),
    toggle: () => el.querySelector('app-header button.lg\\:hidden') as HTMLButtonElement,
    drawer: () => el.querySelector('mat-sidenav') as HTMLElement,
  };
}

describe('AppShell', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
  });

  it('pinta header, panel a la derecha, contenido central y router-outlet', async () => {
    const { el } = await setup();
    expect(el.querySelector('app-header header')).not.toBeNull();
    expect(el.querySelector('main#main-content router-outlet')).not.toBeNull();
    const aside = el.querySelector('aside') as HTMLElement;
    expect(aside.querySelector('nav[aria-label="Navegación principal"]')).not.toBeNull();
    // El panel fijo va después del contenido (a su derecha) y solo se muestra desde lg.
    const main = el.querySelector('main') as HTMLElement;
    expect(main.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(aside.classList.contains('hidden')).toBe(true);
    expect(aside.classList.contains('lg:block')).toBe(true);
  });

  it('el panel muestra los ítems del rol de demo y se actualiza al cambiarlo', async () => {
    const { role, flush, asideLinks } = await setup();
    expect(asideLinks()).toEqual([
      'Catálogo',
      'Ofertas',
      'Tiendas',
      'Iniciar sesión',
      'Registrarse',
    ]);

    role.setRole('PRODUCTOR');
    await flush();
    expect(asideLinks()).toEqual([
      'Catálogo',
      'Ofertas',
      'Tiendas',
      'Carrito',
      'Pedidos',
      'Pagos',
      'Mi cuenta',
    ]);
  });

  it('marca la ruta activa con aria-current y el catálogo solo con coincidencia exacta', async () => {
    const { el, router, flush } = await setup();
    await router.navigateByUrl('/catalogo/ofertas');
    await flush();
    const current = Array.from(el.querySelectorAll('aside nav a[aria-current="page"]')).map((a) =>
      a.textContent?.trim(),
    );
    expect(current).toEqual(['Ofertas']);

    await router.navigateByUrl('/catalogo');
    await flush();
    expect(el.querySelector('aside nav a[aria-current="page"]')?.textContent?.trim()).toBe(
      'Catálogo',
    );
  });

  it('el botón del header abre el drawer con el mismo contenido y el enlace lo cierra', async () => {
    const { el, toggle, drawer, flush } = await setup();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-label')).toBe('Abrir navegación');
    expect(toggle().classList.contains('lg:hidden')).toBe(true);

    toggle().click();
    await flush();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().getAttribute('aria-label')).toBe('Cerrar navegación');
    expect(drawer().classList.contains('mat-drawer-opened')).toBe(true);
    expect(drawer().querySelectorAll('nav a').length).toBe(
      el.querySelectorAll('aside nav a').length,
    );

    (drawer().querySelector('nav a') as HTMLAnchorElement).click();
    await flush();
    expect(drawer().classList.contains('mat-drawer-opened')).toBe(false);
  });

  it('el drawer se cierra con su botón de cerrar', async () => {
    const { el, toggle, drawer, flush } = await setup();
    toggle().click();
    await flush();
    (el.querySelector('mat-sidenav button[aria-label="Cerrar navegación"]') as HTMLElement).click();
    await flush();
    expect(drawer().classList.contains('mat-drawer-opened')).toBe(false);
  });

  it('no repite ids entre el panel fijo y el del drawer', async () => {
    const { el } = await setup();
    const ids = Array.from(el.querySelectorAll('[id]')).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('"Saltar al contenido" mueve el foco al main sin cambiar la URL', async () => {
    const { el, router } = await setup();
    const link = el.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
    link.click();
    expect(document.activeElement).toBe(el.querySelector('main'));
    expect(router.url).not.toContain('main-content');
  });

  it('tras navegar el foco pasa al contenido, pero no en la carga inicial', async () => {
    const { el, router, flush } = await setup();
    await router.navigateByUrl('/catalogo');
    await flush();
    expect(document.activeElement).not.toBe(el.querySelector('main'));

    await router.navigateByUrl('/pedidos');
    await flush();
    expect(document.activeElement).toBe(el.querySelector('main'));
  });

  it('el selector de rol del header cambia el rol de demo', async () => {
    const { el, role, flush } = await setup();
    const trigger = el.querySelector('span.sm\\:inline-flex app-menu button') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe('Rol de demo: Visitante');
    trigger.click();
    await flush();
    const admin = Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]')).find((i) =>
      i.textContent?.includes('Administrador'),
    ) as HTMLElement;
    admin.click();
    await flush();
    expect(role.role()).toBe('ADMIN');
    expect(trigger.textContent).toContain('Administrador');
  });

  it('el selector de tema cambia el tema', async () => {
    const { el, theme, flush } = await setup();
    const trigger = el.querySelector('app-menu button[aria-label="Tema"]') as HTMLButtonElement;
    trigger.click();
    await flush();
    const dark = Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]')).find((i) =>
      i.textContent?.includes('Oscuro'),
    ) as HTMLElement;
    dark.click();
    await flush();
    expect(theme.mode()).toBe('dark');
  });

  it('el menú de usuario cambia según el rol y "Cerrar sesión" vuelve a visitante', async () => {
    const { el, role, router, flush } = await setup();
    role.setRole('PRODUCTOR');
    await flush();
    const trigger = el.querySelector(
      'app-menu button[aria-label="Menú de usuario"]',
    ) as HTMLButtonElement;
    trigger.click();
    await flush();
    const labels = Array.from(document.querySelectorAll('[mat-menu-item]')).map((i) =>
      i.textContent?.trim(),
    );
    expect(labels).toEqual(['Mi cuenta', 'Cerrar sesión']);

    (document.querySelectorAll('[mat-menu-item]')[1] as HTMLElement).click();
    await flush();
    expect(role.role()).toBe('VISITANTE');
    expect(router.url).toBe('/catalogo');
  });

  it('cierra el drawer cuando la pantalla pasa a tamaño grande', async () => {
    // ThemeService y el shell piden matchMedia: se guardan todos los listeners.
    const listeners: ((e: MediaQueryListEvent) => void)[] = [];
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
      removeEventListener: () => undefined,
    }) as unknown as typeof window.matchMedia;

    const { toggle, drawer, flush } = await setup();
    toggle().click();
    await flush();
    expect(drawer().classList.contains('mat-drawer-opened')).toBe(true);

    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent);
    }
    await flush();
    expect(drawer().classList.contains('mat-drawer-opened')).toBe(false);
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
  });
});
