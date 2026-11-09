import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AdminUser } from '../../models/admin.types';
import { UserActions } from './user-actions';

const ID = '0123456789abcdef01234567';

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: ID,
    email: 'ana@correo.com',
    nombre: 'Ana',
    documento: '123',
    rol: 'PRODUCTOR',
    status: 'ACTIVE',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

@Component({
  imports: [UserActions],
  template: `<app-user-actions
    [user]="user()"
    [currentUserId]="currentUserId()"
    (userChange)="user.set($event); changes.push($event)"
  />`,
})
class Host {
  user = signal<AdminUser>(user());
  currentUserId = signal<string | null>('admin-id');
  changes: AdminUser[] = [];
}

async function settle(f: ComponentFixture<Host>, ms = 0) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve, ms));
  f.detectChanges();
}

function setup(initial: AdminUser = user(), currentUserId: string | null = 'admin-id') {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(Host);
  f.componentInstance.user.set(initial);
  f.componentInstance.currentUserId.set(currentUserId);
  f.detectChanges();
  return { f, http: TestBed.inject(HttpTestingController), el: f.nativeElement as HTMLElement };
}

const labels = (el: ParentNode) =>
  Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
const button = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
const dialog = () => document.querySelector('mat-dialog-container') as HTMLElement | null;

describe('UserActions', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  it('un proveedor pendiente ofrece solo Aprobar y Rechazar', () => {
    const { el } = setup(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }));
    expect(labels(el)).toEqual(['Aprobar', 'Rechazar']);
  });

  it('una cuenta activa ofrece Deshabilitar y Cambiar rol', () => {
    const { el } = setup(user({ status: 'ACTIVE' }));
    expect(labels(el)).toEqual(['Deshabilitar', 'Cambiar rol']);
  });

  it('una cuenta deshabilitada ofrece Habilitar y Cambiar rol', () => {
    const { el } = setup(user({ status: 'DISABLED' }));
    expect(labels(el)).toEqual(['Habilitar', 'Cambiar rol']);
  });

  it('una cuenta rechazada no ofrece acciones', () => {
    const { el } = setup(user({ rol: 'PROVEEDOR', status: 'REJECTED' }));
    expect(labels(el)).toEqual([]);
    expect(el.textContent).toContain('No hay acciones disponibles');
  });

  it('el administrador en su propia cuenta no ve Deshabilitar ni Cambiar rol y ve la nota', () => {
    const { el } = setup(user({ id: 'admin-id', rol: 'ADMIN' }), 'admin-id');
    expect(labels(el)).toEqual([]);
    expect(el.textContent).toContain('Es tu propia cuenta');
  });

  it('Aprobar llama al endpoint sin confirmación, emite el usuario y muestra el resultado', async () => {
    const { f, http, el } = setup(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }));
    button(el, 'Aprobar').click();
    const req = http.expectOne(`/api/auth/users/${ID}/approve`);
    expect(req.request.method).toBe('POST');
    f.detectChanges();
    expect(button(el, 'Aprobar').disabled).toBe(true);
    req.flush(user({ rol: 'PROVEEDOR', status: 'ACTIVE' }));
    await settle(f);
    expect(f.componentInstance.changes.length).toBe(1);
    expect(f.componentInstance.changes[0].status).toBe('ACTIVE');
    expect(el.textContent).toContain('Cuenta aprobada.');
    expect(labels(el)).toEqual(['Deshabilitar', 'Cambiar rol']);
  });

  it('Habilitar se ejecuta sin diálogo', async () => {
    const { f, http, el } = setup(user({ status: 'DISABLED' }));
    button(el, 'Habilitar').click();
    http.expectOne(`/api/auth/users/${ID}/enable`).flush(user({ status: 'ACTIVE' }));
    await settle(f);
    expect(dialog()).toBeNull();
    expect(el.textContent).toContain('Cuenta habilitada.');
  });

  it('Rechazar abre un diálogo y confirmar envía el motivo', async () => {
    const { f, http, el } = setup(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }));
    button(el, 'Rechazar').click();
    await settle(f, 50);
    expect(dialog()).not.toBeNull();
    expect(dialog()!.textContent).toContain('Rechazar solicitud');
    const input = dialog()!.querySelector('input') as HTMLInputElement;
    input.value = 'Documento ilegible';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    button(dialog()!, 'Rechazar').click();
    const req = http.expectOne(`/api/auth/users/${ID}/reject`);
    expect(req.request.body).toEqual({ reason: 'Documento ilegible' });
    req.flush(
      user({ rol: 'PROVEEDOR', status: 'REJECTED', rejectionReason: 'Documento ilegible' }),
    );
    await settle(f, 300);
    expect(dialog()).toBeNull();
    expect(el.textContent).toContain('Solicitud rechazada.');
  });

  it('Rechazar sin motivo omite reason', async () => {
    const { f, http, el } = setup(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }));
    button(el, 'Rechazar').click();
    await settle(f, 50);
    button(dialog()!, 'Rechazar').click();
    const req = http.expectOne(`/api/auth/users/${ID}/reject`);
    expect(req.request.body).toEqual({});
    req.flush(user({ rol: 'PROVEEDOR', status: 'REJECTED' }));
    await settle(f, 300);
  });

  it('un motivo de más de 500 caracteres no se envía', async () => {
    const { f, http, el } = setup(user({ rol: 'PROVEEDOR', status: 'PENDING_APPROVAL' }));
    button(el, 'Rechazar').click();
    await settle(f, 50);
    const input = dialog()!.querySelector('input') as HTMLInputElement;
    input.value = 'x'.repeat(501);
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    button(dialog()!, 'Rechazar').click();
    http.expectNone(`/api/auth/users/${ID}/reject`);
    expect(dialog()!.textContent).toContain('Máximo 500 caracteres');
  });

  it('Cancelar en el diálogo no envía nada', async () => {
    const { f, http, el } = setup(user({ status: 'ACTIVE' }));
    button(el, 'Deshabilitar').click();
    await settle(f, 50);
    expect(dialog()!.textContent).toContain('se cerrarán todas sus sesiones');
    button(dialog()!, 'Cancelar').click();
    await settle(f, 300);
    http.expectNone(`/api/auth/users/${ID}/disable`);
    expect(f.componentInstance.changes).toEqual([]);
  });

  it('Deshabilitar confirma, llama al endpoint y avisa del cierre de sesiones', async () => {
    const { f, http, el } = setup(user({ status: 'ACTIVE' }));
    button(el, 'Deshabilitar').click();
    await settle(f, 50);
    button(dialog()!, 'Deshabilitar').click();
    http.expectOne(`/api/auth/users/${ID}/disable`).flush(user({ status: 'DISABLED' }));
    await settle(f, 300);
    expect(el.textContent).toContain('Cuenta deshabilitada. Se cerraron todas sus sesiones.');
    expect(labels(el)).toEqual(['Habilitar', 'Cambiar rol']);
  });

  it('Cambiar rol ofrece solo los roles distintos del actual y envía el elegido', async () => {
    const { f, http, el } = setup(user({ rol: 'PRODUCTOR', status: 'ACTIVE' }));
    button(el, 'Cambiar rol').click();
    await settle(f, 50);
    const actions = f.debugElement.query(By.directive(UserActions))
      .componentInstance as unknown as {
      roleOptions(): { value: string }[];
    };
    expect(actions.roleOptions().map((o) => o.value)).toEqual(['PROVEEDOR', 'ADMIN']);
    expect(dialog()!.textContent).toContain('se cerrarán todas sus sesiones');
    button(dialog()!, 'Cambiar rol').click();
    const req = http.expectOne(`/api/auth/users/${ID}/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ rol: 'PROVEEDOR' });
    req.flush(user({ rol: 'PROVEEDOR' }));
    await settle(f, 300);
    expect(el.textContent).toContain('Rol cambiado a Proveedor');
  });

  it('un error del backend se muestra tal cual y no cambia el usuario', async () => {
    const { f, http, el } = setup(user({ status: 'ACTIVE' }));
    button(el, 'Deshabilitar').click();
    await settle(f, 50);
    button(dialog()!, 'Deshabilitar').click();
    http
      .expectOne(`/api/auth/users/${ID}/disable`)
      .flush(
        { statusCode: 409, message: 'No puedes deshabilitar esta cuenta', error: 'Conflict' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(f, 300);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No puedes deshabilitar esta cuenta',
    );
    expect(f.componentInstance.changes).toEqual([]);
    expect(labels(el)).toEqual(['Deshabilitar', 'Cambiar rol']);
  });

  it('un doble clic en confirmar envía una sola petición', async () => {
    const { f, http, el } = setup(user({ status: 'ACTIVE' }));
    button(el, 'Deshabilitar').click();
    await settle(f, 50);
    const confirm = button(dialog()!, 'Deshabilitar');
    confirm.click();
    confirm.click();
    const req = http.expectOne(`/api/auth/users/${ID}/disable`);
    req.flush(user({ status: 'DISABLED' }));
    await settle(f, 300);
  });
});
