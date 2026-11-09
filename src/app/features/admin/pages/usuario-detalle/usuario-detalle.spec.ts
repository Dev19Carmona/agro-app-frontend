import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../../core/auth';
import { AdminUser } from '../../models/admin.types';
import { UsuarioDetalle } from './usuario-detalle';

const ID = '0123456789abcdef01234567';

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: ID,
    email: 'ana@correo.com',
    nombre: 'Ana Pérez',
    documento: '99887766',
    rol: 'PROVEEDOR',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

async function setup(url = `/admin/usuarios/${ID}`) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/usuarios/:id', component: UsuarioDetalle }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, settle, http };
}

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';
const labels = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

describe('UsuarioDetalle', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra los datos, incluido el documento, y las acciones del estado', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/auth/users/${ID}`).flush(user());
    await settle();
    expect(text(el)).toContain('Ana Pérez');
    expect(text(el)).toContain('ana@correo.com');
    expect(text(el)).toContain('99887766');
    expect(text(el)).toContain('Proveedor');
    expect(text(el)).toContain('Pendiente de aprobación');
    expect(labels(el)).toEqual(['Aprobar', 'Rechazar']);
  });

  it('muestra motivo y fecha de revisión de una cuenta rechazada', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/auth/users/${ID}`).flush(
      user({
        status: 'REJECTED',
        rejectionReason: 'Documento ilegible',
        reviewedAt: '2026-11-02T09:00:00.000Z',
      }),
    );
    await settle();
    expect(text(el)).toContain('Documento ilegible');
    expect(text(el)).toContain('Revisada');
  });

  it('un proveedor con tienda enlaza a /admin/tiendas/:storeId', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/auth/users/${ID}`)
      .flush(user({ status: 'ACTIVE', storeId: 'abcdefabcdefabcdefabcdef' }));
    await settle();
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent?.includes('Ver tienda'));
    expect(link?.getAttribute('href')).toBe('/admin/tiendas/abcdefabcdefabcdefabcdef');
  });

  it('un productor enlaza a sus pedidos y pagos con ?buyerId=', async () => {
    const { el, settle, http } = await setup();
    http.expectOne(`/api/auth/users/${ID}`).flush(user({ rol: 'PRODUCTOR', status: 'ACTIVE' }));
    await settle();
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/admin/pedidos?buyerId=${ID}`);
    expect(hrefs).toContain(`/admin/pagos?buyerId=${ID}`);
  });

  it('el administrador ve la nota en su propia cuenta y no sus acciones', async () => {
    const { el, settle, http } = await setup();
    const session = TestBed.inject(SessionService);
    session.setUser({ id: ID, email: 'a@a.com', nombre: 'Admin', rol: 'ADMIN', status: 'ACTIVE' });
    http.expectOne(`/api/auth/users/${ID}`).flush(user({ rol: 'ADMIN', status: 'ACTIVE' }));
    await settle();
    expect(labels(el)).toEqual([]);
    expect(text(el)).toContain('Es tu propia cuenta');
  });

  it('un id con formato inválido no pide nada y muestra «Usuario no encontrado»', async () => {
    const { el, settle } = await setup('/admin/usuarios/abc');
    await settle();
    expect(text(el)).toContain('Usuario no encontrado');
    expect(el.querySelector('a[href="/admin/usuarios"]')).not.toBeNull();
  });

  it('un 404 muestra «Usuario no encontrado» con enlace a la lista', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/auth/users/${ID}`)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(el)).toContain('Usuario no encontrado');
  });

  it('con el backend apagado muestra el error con Reintentar', async () => {
    const { el, settle, http } = await setup();
    http
      .expectOne(`/api/auth/users/${ID}`)
      .flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(text(el)).toContain('No se pudo conectar con el servidor');
    expect(labels(el)).toContain('Reintentar');
  });
});
