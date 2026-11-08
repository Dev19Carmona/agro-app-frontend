import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Registro } from './registro';

@Component({ template: 'página' })
class Page {}

interface Fill {
  nombre?: string;
  email?: string;
  documento?: string;
  password?: string;
  rol?: 'Productor' | 'Proveedor' | null;
  acepta?: boolean;
}

const VALID: Required<Fill> = {
  nombre: 'Ana Pérez',
  email: 'ana@agro.test',
  documento: 'ABC-12345',
  password: 'ClaveSegura123',
  rol: 'Productor',
  acepta: true,
};

async function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'auth/registro', component: Registro },
        { path: 'auth/login', component: Page },
        { path: 'catalogo', component: Page },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/auth/registro');
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const text = (selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fill = async (data: Fill = {}) => {
    const v = { ...VALID, ...data };
    text('input[autocomplete="name"]', v.nombre);
    text('input[type="email"]', v.email);
    text('input[autocomplete="off"]', v.documento);
    text('input[autocomplete="new-password"]', v.password);
    await settle();
    if (v.rol) {
      (el.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
      await settle();
      const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find((o) =>
        o.textContent?.includes(v.rol as string),
      ) as HTMLElement;
      option.click();
      await settle();
    }
    const box = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (v.acepta !== box.checked) {
      box.click();
    }
    await settle();
  };
  const send = async () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  return {
    el,
    fill,
    send,
    settle,
    backend: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    errors: () =>
      Array.from(el.querySelectorAll('mat-error, app-checkbox [aria-live]'))
        .map((e) => e.textContent?.trim())
        .filter(Boolean),
    alerts: () =>
      Array.from(el.querySelectorAll('app-alert')).map((a) => ({
        role: a.getAttribute('role'),
        text: a.textContent?.replace(/\s+/g, ' ').trim(),
      })),
  };
}

describe('Registro', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = ''));
    localStorage.clear();
  });

  it('muestra los seis campos y el enlace a iniciar sesión', async () => {
    const { el } = await setup();
    expect(el.querySelector('h1')?.textContent).toBe('Crear cuenta');
    expect(el.querySelectorAll('app-input').length).toBe(4);
    expect(el.querySelector('app-select')).not.toBeNull();
    expect(el.querySelector('app-checkbox')).not.toBeNull();
    expect(el.querySelector('a[href="/auth/login"]')?.textContent).toContain('Iniciar sesión');
  });

  describe('validación del cliente: no envía el formulario si algo falla', () => {
    it('con todo vacío muestra los errores de cada campo y enfoca el primero', async () => {
      const { el, send, errors } = await setup();
      await send();
      expect(errors()).toEqual([
        'Escribe tu nombre',
        'Escribe tu correo',
        'Escribe tu documento',
        'Escribe una contraseña',
        'Elige un rol',
        'Debes aceptar el tratamiento de datos',
      ]);
      expect(document.activeElement).toBe(el.querySelector('input[autocomplete="name"]'));
    });

    it.each<[string, Fill, string]>([
      ['nombre de un carácter', { nombre: 'A' }, 'Escribe tu nombre (2 a 120 letras)'],
      ['correo mal formado', { email: 'no-es-correo' }, 'Escribe un correo válido'],
      [
        'documento con espacios',
        { documento: '123 456' },
        'Documento inválido: 5 a 20 letras, números o guiones',
      ],
      [
        'contraseña corta',
        { password: 'Corta1a' },
        'La contraseña debe tener al menos 10 caracteres',
      ],
      [
        'contraseña sin mayúscula',
        { password: 'clavesegura123' },
        'La contraseña debe incluir una mayúscula',
      ],
      [
        'contraseña sin minúscula',
        { password: 'CLAVESEGURA123' },
        'La contraseña debe incluir una minúscula',
      ],
      [
        'contraseña sin número',
        { password: 'ClaveSegura' },
        'La contraseña debe incluir un número',
      ],
      [
        'contraseña con el email',
        { email: 'ana@agro.test', password: 'XAna@agro.testY1' },
        'La contraseña no puede contener el email',
      ],
      ['sin rol', { rol: null }, 'Elige un rol'],
      ['sin consentimiento', { acepta: false }, 'Debes aceptar el tratamiento de datos'],
    ])('%s', async (_name, data, message) => {
      const { fill, send, errors } = await setup();
      await fill(data);
      await send();
      expect(errors()).toEqual([message]);
      // `verify()` del afterEach comprueba que no salió ninguna petición.
    });
  });

  describe('registro correcto', () => {
    it('PRODUCTOR: envía los datos limpios y va a /auth/login?aviso=registro', async () => {
      const { fill, send, backend, router, settle } = await setup();
      await fill({ nombre: '  Ana Pérez ', email: ' ana@agro.test ', documento: ' ABC-12345 ' });
      await send();
      const req = backend.expectOne('/api/auth/register');
      expect(req.request.body).toEqual({
        email: 'ana@agro.test',
        password: 'ClaveSegura123',
        nombre: 'Ana Pérez',
        documento: 'ABC-12345',
        rol: 'PRODUCTOR',
        aceptaTratamientoDatos: true,
      });
      req.flush({
        id: '1',
        email: 'ana@agro.test',
        nombre: 'Ana Pérez',
        rol: 'PRODUCTOR',
        status: 'ACTIVE',
      });
      await settle();
      expect(router.url).toBe('/auth/login?aviso=registro');
    });

    it('PROVEEDOR: muestra la pantalla de solicitud pendiente en la misma ruta', async () => {
      const { el, fill, send, backend, router, settle, alerts } = await setup();
      await fill({ rol: 'Proveedor' });
      await send();
      const req = backend.expectOne('/api/auth/register');
      expect(req.request.body.rol).toBe('PROVEEDOR');
      req.flush({
        id: '2',
        email: 'ana@agro.test',
        nombre: 'Ana Pérez',
        rol: 'PROVEEDOR',
        status: 'PENDING_APPROVAL',
      });
      await settle();

      expect(router.url).toBe('/auth/registro');
      expect(el.querySelector('h1')?.textContent).toBe('Solicitud enviada');
      expect(alerts()).toEqual([
        {
          role: 'status',
          text: 'Pendiente de aprobación Un administrador revisará tu cuenta de proveedor. Hasta que la apruebe no podrás iniciar sesión.',
        },
      ]);
      expect(el.querySelector('form')).toBeNull();
      expect(el.querySelector('a[href="/catalogo"]')).not.toBeNull();
    });

    it('mientras envía deshabilita el botón', async () => {
      const { el, fill, send, backend, settle } = await setup();
      await fill();
      await send();
      const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Creando cuenta…');
      backend.expectOne('/api/auth/register').flush({});
      await settle();
    });
  });

  describe('errores del backend', () => {
    async function failWith(status: number, body: object | null) {
      const ctx = await setup();
      await ctx.fill();
      await ctx.send();
      const req = ctx.backend.expectOne('/api/auth/register');
      if (status === 0) {
        req.error(new ProgressEvent('error'));
      } else {
        req.flush(body, { status, statusText: 'x' });
      }
      await ctx.settle();
      return ctx;
    }

    it('409 muestra "Ese email ya está registrado" y conserva lo escrito', async () => {
      const { alerts, router, el } = await failWith(409, {
        message: 'El email ya está registrado',
      });
      expect(alerts()).toEqual([{ role: 'alert', text: 'Ese email ya está registrado' }]);
      expect(router.url).toBe('/auth/registro');
      expect((el.querySelector('input[type="email"]') as HTMLInputElement).value).toBe(
        'ana@agro.test',
      );
    });

    it('400 muestra el mensaje del backend', async () => {
      const { alerts } = await failWith(400, { message: ['La contraseña es débil', 'Otro'] });
      expect(alerts()).toEqual([{ role: 'alert', text: 'La contraseña es débil. Otro' }]);
    });

    it('429 muestra el aviso de espera y el botón vuelve a estar activo', async () => {
      const { alerts, el } = await failWith(429, { message: 'ThrottlerException' });
      expect(alerts()).toEqual([{ role: 'alert', text: 'Demasiados intentos, espera un minuto' }]);
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('sin respuesta del servidor muestra "No se pudo conectar con el servidor"', async () => {
      const { alerts } = await failWith(0, null);
      expect(alerts()).toEqual([{ role: 'alert', text: 'No se pudo conectar con el servidor' }]);
    });
  });
});
