import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Profile, REFRESH_TOKEN_STORAGE_KEY } from '../../../../core/auth';
import { SessionService } from '../../../../core/auth';
import { Cuenta } from './cuenta';

@Component({ template: 'página' })
class Page {}

const PROFILE: Profile = {
  id: '1',
  email: 'ana@agro.test',
  nombre: 'Ana Pérez',
  rol: 'PROVEEDOR',
  status: 'ACTIVE',
  storeId: 'tienda-42',
};

async function setup(profile: Profile | 'pending' = PROFILE) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'cuenta', component: Cuenta },
        { path: 'auth/login', component: Page },
        { path: 'catalogo', component: Page },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const session = TestBed.inject(SessionService);
  session.start(
    { accessToken: 'access-1', refreshToken: 'refresh-1' },
    { id: '1', email: 'ana@agro.test', nombre: 'Ana', rol: 'PROVEEDOR', status: 'ACTIVE' },
  );
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/cuenta');
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  if (profile !== 'pending') {
    backend.expectOne('/api/auth/me').flush(profile);
    await settle();
  }
  const type = (selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fillPasswords = async (current = 'ClaveActual123', next = 'ClaveNueva12345') => {
    type('input[autocomplete="current-password"]', current);
    type('input[autocomplete="new-password"]', next);
    await settle();
  };
  const submitPassword = async () => {
    (el.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  const buttonByText = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  return {
    el,
    backend,
    session,
    router: TestBed.inject(Router),
    settle,
    fillPasswords,
    submitPassword,
    buttonByText,
    errors: () => Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim()),
    alerts: () =>
      Array.from(el.querySelectorAll('app-alert')).map((a) => ({
        role: a.getAttribute('role'),
        text: a.textContent?.trim(),
      })),
    /** Pares `término → valor` de la lista de datos del perfil. */
    profile: () =>
      Object.fromEntries(
        Array.from(el.querySelectorAll('dl > div')).map((row) => [
          row.querySelector('dt')?.textContent?.trim(),
          row.querySelector('dd')?.textContent?.trim(),
        ]),
      ),
  };
}

describe('Cuenta', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  describe('perfil', () => {
    it('pide GET /auth/me y muestra nombre, correo, rol, estado y tienda', async () => {
      const { el, profile } = await setup();
      expect(el.querySelector('h1')?.textContent).toBe('Mi cuenta');
      expect(profile()).toEqual({
        Nombre: 'Ana Pérez',
        Correo: 'ana@agro.test',
        Rol: 'Proveedor',
        Estado: 'Activa',
        Tienda: 'tienda-42',
      });
    });

    it('no muestra la tienda si el usuario no tiene', async () => {
      const { profile } = await setup({ ...PROFILE, rol: 'PRODUCTOR', storeId: undefined });
      expect(profile()).toEqual({
        Nombre: 'Ana Pérez',
        Correo: 'ana@agro.test',
        Rol: 'Productor',
        Estado: 'Activa',
      });
    });

    it.each([
      ['PENDING_APPROVAL', 'Pendiente de aprobación'],
      ['REJECTED', 'Rechazada'],
      ['DISABLED', 'Deshabilitada'],
    ] as const)('estado %s se muestra como %s', async (status, label) => {
      const { profile } = await setup({ ...PROFILE, status });
      expect(profile().Estado).toBe(label);
    });

    it('mientras carga muestra un aviso de carga', async () => {
      const { el, backend, settle } = await setup('pending');
      expect(el.textContent).toContain('Cargando tus datos…');
      backend.expectOne('/api/auth/me').flush(PROFILE);
      await settle();
      expect(el.textContent).not.toContain('Cargando tus datos…');
    });

    it('si falla muestra el error y permite reintentar', async () => {
      const ctx = await setup('pending');
      ctx.backend
        .expectOne('/api/auth/me')
        .flush({ message: 'No autenticado' }, { status: 401, statusText: 'x' });
      await ctx.settle();
      expect(ctx.alerts()).toEqual([{ role: 'alert', text: 'No autenticado' }]);

      ctx.buttonByText('Reintentar').click();
      await ctx.settle();
      ctx.backend.expectOne('/api/auth/me').flush(PROFILE);
      await ctx.settle();
      expect(ctx.alerts()).toEqual([]);
      expect(ctx.profile().Nombre).toBe('Ana Pérez');
    });
  });

  describe('cambio de contraseña', () => {
    it('con campos vacíos no envía nada y enfoca el primero', async () => {
      const { el, submitPassword, errors } = await setup();
      await submitPassword();
      expect(errors()).toEqual(['Escribe tu contraseña actual', 'Escribe la contraseña nueva']);
      expect(document.activeElement).toBe(
        el.querySelector('input[autocomplete="current-password"]'),
      );
    });

    it.each([
      ['Corta1a', 'La contraseña debe tener al menos 10 caracteres'],
      ['clavenueva12345', 'La contraseña debe incluir una mayúscula'],
      ['ClaveNueva', 'La contraseña debe incluir un número'],
      ['XAna@agro.testY1', 'La contraseña no puede contener el email'],
    ])('rechaza la nueva contraseña %s', async (next, message) => {
      const { fillPasswords, submitPassword, errors } = await setup();
      await fillPasswords('ClaveActual123', next);
      await submitPassword();
      expect(errors()).toEqual([message]);
      // `verify()` del afterEach comprueba que no salió ninguna petición.
    });

    it('con datos válidos borra la sesión local y va a /auth/login?aviso=clave', async () => {
      const { fillPasswords, submitPassword, backend, session, router, settle } = await setup();
      await fillPasswords();
      await submitPassword();
      const req = backend.expectOne('/api/auth/change-password');
      expect(req.request.body).toEqual({
        currentPassword: 'ClaveActual123',
        newPassword: 'ClaveNueva12345',
      });
      req.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(session.status()).toBe('anonymous');
      expect(session.getAccessToken()).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.url).toBe('/auth/login?aviso=clave');
    });

    it('con la contraseña actual incorrecta muestra el error y conserva la sesión', async () => {
      const { fillPasswords, submitPassword, backend, session, router, settle, alerts } =
        await setup();
      await fillPasswords();
      await submitPassword();
      backend
        .expectOne('/api/auth/change-password')
        .flush({ message: 'Contraseña actual incorrecta' }, { status: 401, statusText: 'x' });
      await settle();

      expect(alerts()).toEqual([{ role: 'alert', text: 'Contraseña actual incorrecta' }]);
      expect(session.isAuthenticated()).toBe(true);
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
      expect(router.url).toBe('/cuenta');
    });

    it('un 400 del backend muestra su mensaje y el botón vuelve a estar activo', async () => {
      const ctx = await setup();
      await ctx.fillPasswords();
      await ctx.submitPassword();
      ctx.backend
        .expectOne('/api/auth/change-password')
        .flush({ message: ['Política no cumplida', 'Otra'] }, { status: 400, statusText: 'x' });
      await ctx.settle();
      expect(ctx.alerts()).toEqual([{ role: 'alert', text: 'Política no cumplida. Otra' }]);
      expect(ctx.buttonByText('Cambiar contraseña').disabled).toBe(false);
    });

    it('mientras envía deshabilita el botón', async () => {
      const ctx = await setup();
      await ctx.fillPasswords();
      await ctx.submitPassword();
      const button = ctx.el.querySelector('form button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Cambiando…');
      ctx.backend
        .expectOne('/api/auth/change-password')
        .flush(null, { status: 204, statusText: 'No Content' });
      await ctx.settle();
    });
  });

  describe('cerrar sesión', () => {
    it('envía POST /auth/logout, borra el refresh token y deja al usuario como visitante', async () => {
      const { buttonByText, backend, session, router, settle } = await setup();
      buttonByText('Cerrar sesión').click();
      backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      await settle();
      expect(session.role()).toBe('VISITANTE');
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.url).toBe('/catalogo');
    });

    it('borra la sesión local aunque la llamada falle', async () => {
      const { buttonByText, backend, session, settle } = await setup();
      buttonByText('Cerrar sesión').click();
      backend.expectOne('/api/auth/logout').error(new ProgressEvent('error'));
      await settle();
      expect(session.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
