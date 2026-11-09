import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminUser } from '../../models/admin.types';
import { Usuarios } from './usuarios';

function user(id: string, overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id,
    email: `${id}@correo.com`,
    nombre: `Usuario ${id}`,
    documento: '99887766',
    rol: 'PRODUCTOR',
    status: 'ACTIVE',
    createdAt: '2026-11-08T15:30:00.000Z',
    ...overrides,
  };
}

function pageOf(data: AdminUser[], page = 1, totalPages = 1) {
  return { data, page, limit: 10, total: data.length, totalPages };
}

async function setup(url = '/admin/usuarios') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/usuarios', component: Usuarios }]),
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
  const list = () => http.expectOne((r) => r.url === '/api/auth/users');
  return { el, settle, http, harness, list };
}

describe('Usuarios', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista nombre, correo, rol, estado y fecha, sin mostrar el documento', async () => {
    const { el, settle, list } = await setup();
    list().flush(
      pageOf([
        user('u1'),
        user('u2', { rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }),
        user('u3', { status: 'DISABLED' }),
      ]),
    );
    await settle();
    const rows = [...el.querySelectorAll('tbody tr')].map(
      (r) => r.textContent?.replace(/\s+/g, ' ') ?? '',
    );
    expect(rows.length).toBe(3);
    expect(rows[0]).toContain('Usuario u1');
    expect(rows[0]).toContain('u1@correo.com');
    expect(rows[0]).toContain('Productor');
    expect(rows[0]).toContain('Activo');
    expect(rows[0]).toMatch(/2026/);
    expect(rows[1]).toContain('Proveedor');
    expect(rows[1]).toContain('Pendiente de aprobación');
    expect(rows[2]).toContain('Deshabilitado');
    expect(el.textContent).not.toContain('99887766');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/admin/usuarios/u1');
  });

  it('pide la página 1 con límite 10 y sin filtros por defecto', async () => {
    const { settle, list } = await setup();
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('rol')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush(pageOf([user('u1')]));
    await settle();
  });

  it('lee ?rol=, ?status= y ?page= de la URL', async () => {
    const { settle, list } = await setup(
      '/admin/usuarios?rol=PROVEEDOR&status=PENDING_APPROVAL&page=2',
    );
    const req = list();
    expect(req.request.params.get('rol')).toBe('PROVEEDOR');
    expect(req.request.params.get('status')).toBe('PENDING_APPROVAL');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pageOf([user('u2')], 2, 3));
    await settle();
  });

  it('ignora valores inválidos de la URL', async () => {
    const { settle, list } = await setup('/admin/usuarios?rol=VISITANTE&status=otro&page=-4');
    const req = list();
    expect(req.request.params.has('rol')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([user('u1')]));
    await settle();
  });

  it('cambiar un filtro escribe la URL y reinicia la página', async () => {
    const { settle, list, harness } = await setup('/admin/usuarios?page=3');
    list().flush(pageOf([user('u1')], 3, 5));
    await settle();
    const page = harness.routeDebugElement!.componentInstance as unknown as {
      applyFilters(values: Record<string, string>): void;
    };
    page.applyFilters({ status: 'PENDING_APPROVAL' });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/admin/usuarios?status=PENDING_APPROVAL');
    const req = list();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pageOf([user('u2')]));
    await settle();
  });

  it('sin resultados con filtros ofrece quitarlos', async () => {
    const { el, settle, list } = await setup('/admin/usuarios?status=REJECTED');
    list().flush(pageOf([]));
    await settle();
    expect(el.textContent).toContain('No hay usuarios con estos filtros');
    expect(el.textContent).toContain('Quitar los filtros');
  });

  it('con el backend apagado muestra el error y Reintentar vuelve a pedir', async () => {
    const { el, settle, list } = await setup();
    list().flush({ message: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(el.textContent).toContain('No se pudo conectar con el servidor');
    const retry = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    list().flush(pageOf([user('u1')]));
    await settle();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });
});
