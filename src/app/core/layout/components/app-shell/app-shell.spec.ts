import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppRole } from '../../../auth';
import { SessionService } from '../../../auth';
import { ThemeService } from '../../../theme';
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
  TestBed.configureTestingModule({
    providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(AppShell);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const session = TestBed.inject(SessionService);
  return {
    fixture,
    el,
    router: TestBed.inject(Router),
    session,
    backend: TestBed.inject(HttpTestingController),
    signIn: (rol: AppRole = 'PRODUCTOR') =>
      session.start(
        { accessToken: 'a', refreshToken: 'r' },
        { id: '1', email: 'ana@agro.test', nombre: 'Ana Pérez', rol, status: 'ACTIVE' },
      ),
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

  it('el panel muestra los ítems del rol de la sesión y se actualiza al iniciar sesión', async () => {
    const { signIn, flush, asideLinks } = await setup();
    expect(asideLinks()).toEqual([
      'Catálogo',
      'Ofertas',
      'Tiendas',
      'Iniciar sesión',
      'Registrarse',
    ]);

    signIn('PRODUCTOR');
    await flush();
    expect(asideLinks()).toEqual([
      'Catálogo',
      'Ofertas',
      'Tiendas',
      'Carrito',
      'Pedidos',
      'Pagos',
      'Notificaciones',
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

  it('el visitante ve Iniciar sesión y no hay selector de rol ni menú de usuario', async () => {
    const { el } = await setup();
    const login = el.querySelector('app-header a[href="/auth/login"]') as HTMLAnchorElement;
    expect(login.textContent?.trim()).toBe('Iniciar sesión');
    expect(el.querySelector('app-header button[aria-label^="Menú de usuario"]')).toBeNull();
    expect(el.querySelector('app-header button[aria-label^="Rol de demo"]')).toBeNull();
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

  describe('menú de usuario', () => {
    async function openMenu(ctx: Awaited<ReturnType<typeof setup>>) {
      ctx.signIn('PRODUCTOR');
      await ctx.flush();
      const trigger = ctx.el.querySelector(
        'app-header span.sm\\:inline-flex app-menu button',
      ) as HTMLButtonElement;
      trigger.click();
      await ctx.flush();
      return trigger;
    }
    const items = () => Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]'));

    it('con sesión muestra el nombre, Mi cuenta y Cerrar sesión, y oculta Iniciar sesión', async () => {
      const ctx = await setup();
      const trigger = await openMenu(ctx);
      expect(trigger.textContent).toContain('Ana Pérez');
      expect(trigger.getAttribute('aria-label')).toBe('Menú de usuario: Ana Pérez');
      expect(items().map((i) => i.textContent?.trim())).toEqual(['Mi cuenta', 'Cerrar sesión']);
      expect(ctx.el.querySelector('app-header a[href="/auth/login"]')).toBeNull();
    });

    it('Mi cuenta navega a /cuenta', async () => {
      const ctx = await setup();
      await openMenu(ctx);
      items()[0].click();
      await ctx.flush();
      expect(ctx.router.url).toBe('/cuenta');
    });

    it('Cerrar sesión envía POST /auth/logout, borra la sesión y va a /catalogo', async () => {
      const ctx = await setup();
      await openMenu(ctx);
      items()[1].click();
      ctx.backend
        .expectOne('/api/auth/logout')
        .flush(null, { status: 204, statusText: 'No Content' });
      await ctx.flush();
      expect(ctx.session.status()).toBe('anonymous');
      expect(localStorage.getItem('agro:refresh-token')).toBeNull();
      expect(ctx.router.url).toBe('/catalogo');
    });

    it('Cerrar sesión borra la sesión local aunque la llamada falle', async () => {
      const ctx = await setup();
      await openMenu(ctx);
      items()[1].click();
      ctx.backend.expectOne('/api/auth/logout').error(new ProgressEvent('error'));
      await ctx.flush();
      expect(ctx.session.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('agro:refresh-token')).toBeNull();
      expect(ctx.router.url).toBe('/catalogo');
    });
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
