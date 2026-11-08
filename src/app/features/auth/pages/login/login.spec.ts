import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LoginResponse } from '../../../../core/auth';
import { SessionService } from '../../../../core/auth';
import { Login } from './login';

@Component({ template: 'página' })
class Page {}

const RESPONSE: LoginResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: '1', email: 'ana@agro.test', nombre: 'Ana', rol: 'PRODUCTOR', status: 'ACTIVE' },
};

async function setup(url = '/auth/login') {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'auth/login', component: Login },
        { path: 'auth/registro', component: Page },
        { path: 'catalogo', component: Page },
        { path: 'pedidos', component: Page },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const email = () => el.querySelector('input[type="email"]') as HTMLInputElement;
  const password = () =>
    el.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
  const submit = () => el.querySelector('button[type="submit"]') as HTMLButtonElement;
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fill = async (mail = 'ana@agro.test', pass = 'Clave12345') => {
    type(email(), mail);
    type(password(), pass);
    await settle();
  };
  const send = async () => {
    submit().click();
    await settle();
  };
  return {
    el,
    settle,
    fill,
    send,
    submit,
    email,
    password,
    backend: TestBed.inject(HttpTestingController),
    session: TestBed.inject(SessionService),
    router: TestBed.inject(Router),
    alerts: () =>
      Array.from(el.querySelectorAll('app-alert')).map((a) => ({
        role: a.getAttribute('role'),
        text: a.textContent?.trim(),
      })),
  };
}

describe('Login', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('muestra el título, los dos campos y el enlace al registro', async () => {
    const { el, email, password } = await setup();
    expect(el.querySelector('h1')?.textContent).toBe('Iniciar sesión');
    expect(email()).not.toBeNull();
    expect(password().type).toBe('password');
    expect(el.querySelector('a[href="/auth/registro"]')?.textContent).toContain('Crear cuenta');
  });

  describe('avisos (?aviso=)', () => {
    it.each([
      ['registro', 'success', 'Cuenta creada. Inicia sesión para continuar.'],
      ['clave', 'success', 'Tu contraseña cambió. Inicia sesión con la nueva.'],
      ['sesion', 'info', 'Tu sesión expiró. Inicia sesión de nuevo.'],
    ])('%s muestra el aviso', async (aviso, _variant, text) => {
      const { alerts } = await setup(`/auth/login?aviso=${aviso}`);
      expect(alerts()).toEqual([{ role: 'status', text }]);
    });

    it.each(['otro', 'constructor', '__proto__', '', '<b>x</b>'])(
      'el valor %j se ignora',
      async (aviso) => {
        const { alerts } = await setup(`/auth/login?aviso=${encodeURIComponent(aviso)}`);
        expect(alerts()).toEqual([]);
      },
    );
  });

  it('con campos vacíos no envía nada, muestra los errores y enfoca el primero', async () => {
    const { el, send, email } = await setup();
    await send();
    const errors = Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(errors).toEqual(['Escribe tu correo', 'Escribe tu contraseña']);
    expect(document.activeElement).toBe(email());
    // `verify()` del afterEach comprueba que no salió ninguna petición.
  });

  describe('credenciales correctas', () => {
    it('envía el correo sin espacios, guarda la sesión y navega a /catalogo', async () => {
      const { fill, send, backend, session, router, settle } = await setup();
      await fill('  ana@agro.test ', 'Clave12345');
      await send();
      const req = backend.expectOne('/api/auth/login');
      expect(req.request.body).toEqual({ email: 'ana@agro.test', password: 'Clave12345' });
      req.flush(RESPONSE);
      await settle();

      expect(session.status()).toBe('authenticated');
      expect(session.role()).toBe('PRODUCTOR');
      expect(router.url).toBe('/catalogo');
    });

    it('navega a returnUrl si es una ruta interna', async () => {
      const { fill, send, backend, router, settle } = await setup(
        '/auth/login?returnUrl=%2Fpedidos',
      );
      await fill();
      await send();
      backend.expectOne('/api/auth/login').flush(RESPONSE);
      await settle();
      expect(router.url).toBe('/pedidos');
    });

    it.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)'])(
      'ignora el returnUrl hostil %s y va a /catalogo',
      async (hostile) => {
        const { fill, send, backend, router, settle } = await setup(
          `/auth/login?returnUrl=${encodeURIComponent(hostile)}`,
        );
        await fill();
        await send();
        backend.expectOne('/api/auth/login').flush(RESPONSE);
        await settle();
        expect(router.url).toBe('/catalogo');
      },
    );

    it('mientras envía deshabilita el botón y cambia su texto', async () => {
      const { fill, send, submit, backend, settle } = await setup();
      await fill();
      await send();
      expect(submit().disabled).toBe(true);
      expect(submit().textContent?.trim()).toBe('Entrando…');
      backend.expectOne('/api/auth/login').flush(RESPONSE);
      await settle();
    });
  });

  describe('errores', () => {
    async function failWith(status: number, body: object | null) {
      const ctx = await setup();
      await ctx.fill();
      await ctx.send();
      const req = ctx.backend.expectOne('/api/auth/login');
      if (status === 0) {
        req.error(new ProgressEvent('error'));
      } else {
        req.flush(body, { status, statusText: 'x' });
      }
      await ctx.settle();
      return ctx;
    }

    it('401 muestra "Credenciales inválidas" en un alert, sin navegar ni iniciar sesión', async () => {
      const { alerts, router, session } = await failWith(401, {
        message: 'Credenciales inválidas',
      });
      expect(alerts()).toEqual([{ role: 'alert', text: 'Credenciales inválidas' }]);
      expect(router.url).toBe('/auth/login');
      expect(session.isAuthenticated()).toBe(false);
    });

    it('403 muestra el mensaje del backend', async () => {
      const message = 'Tu cuenta está pendiente de aprobación';
      const { alerts } = await failWith(403, { message });
      expect(alerts()).toEqual([{ role: 'alert', text: message }]);
    });

    it('429 muestra el aviso de espera y el botón vuelve a estar activo', async () => {
      const { alerts, submit } = await failWith(429, { message: 'ThrottlerException' });
      expect(alerts()).toEqual([{ role: 'alert', text: 'Demasiados intentos, espera un minuto' }]);
      expect(submit().disabled).toBe(false);
      expect(submit().textContent?.trim()).toBe('Iniciar sesión');
    });

    it('sin respuesta del servidor muestra "No se pudo conectar con el servidor"', async () => {
      const { alerts, submit } = await failWith(0, null);
      expect(alerts()).toEqual([{ role: 'alert', text: 'No se pudo conectar con el servidor' }]);
      expect(submit().disabled).toBe(false);
    });

    it('un nuevo intento borra el error anterior', async () => {
      const ctx = await failWith(401, {});
      expect(ctx.alerts().length).toBe(1);
      await ctx.send();
      expect(ctx.alerts()).toEqual([]);
      ctx.backend.expectOne('/api/auth/login').flush(RESPONSE);
      await ctx.settle();
    });
  });
});
