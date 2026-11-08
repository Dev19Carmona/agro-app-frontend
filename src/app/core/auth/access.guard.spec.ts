import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RouteInfo } from '../navigation/navigation.types';
import { accessGuard } from './access.guard';
import { AppRole, SessionRole } from './auth.types';
import { SessionService } from './session';

@Component({ template: 'pantalla' })
class Screen {}

const ALL: SessionRole[] = ['VISITANTE', 'PRODUCTOR', 'PROVEEDOR', 'ADMIN'];

function info(roles: SessionRole[]): RouteInfo {
  return { roles, description: 'x', endpoints: ['GET /x'] };
}

const routes: Routes = [
  {
    path: '',
    canActivateChild: [accessGuard],
    children: [
      { path: 'publica', component: Screen, data: info(ALL) },
      { path: 'invitado', component: Screen, data: info(['VISITANTE']) },
      { path: 'privada', component: Screen, data: info(['PRODUCTOR', 'PROVEEDOR', 'ADMIN']) },
      { path: 'admin', component: Screen, data: info(['ADMIN']) },
      { path: 'sin-datos', component: Screen },
      // Nivel intermedio sin `data.roles`, con una hoja privada debajo.
      {
        path: 'grupo',
        children: [{ path: 'hoja', component: Screen, data: info(['ADMIN']) }],
      },
      { path: 'catalogo', component: Screen },
      { path: 'acceso-denegado', component: Screen },
      { path: 'auth/login', component: Screen },
    ],
  },
];

function login(rol: AppRole): void {
  TestBed.inject(SessionService).start(
    { accessToken: 'a', refreshToken: 'r' },
    { id: '1', email: 'a@agro.test', nombre: 'A', rol, status: 'ACTIVE' },
  );
}

async function go(url: string): Promise<string> {
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return TestBed.inject(Router).url;
}

describe('accessGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  afterEach(() => localStorage.clear());

  it('una ruta sin data.roles no se comprueba', async () => {
    expect(await go('/sin-datos')).toBe('/sin-datos');
  });

  describe('ruta pública (los cuatro roles)', () => {
    it('entra un visitante', async () => {
      expect(await go('/publica')).toBe('/publica');
    });

    it('entra un usuario con sesión', async () => {
      login('PRODUCTOR');
      expect(await go('/publica')).toBe('/publica');
    });
  });

  describe('ruta de invitado (solo VISITANTE)', () => {
    it('entra un visitante', async () => {
      expect(await go('/invitado')).toBe('/invitado');
    });

    it.each<AppRole>(['PRODUCTOR', 'PROVEEDOR', 'ADMIN'])('%s va a /catalogo', async (rol) => {
      login(rol);
      expect(await go('/invitado')).toBe('/catalogo');
    });
  });

  describe('ruta privada', () => {
    it('un visitante va a login con returnUrl', async () => {
      expect(await go('/privada')).toBe('/auth/login?returnUrl=%2Fprivada');
    });

    it('conserva la query en el returnUrl', async () => {
      expect(await go('/privada?tab=2')).toBe('/auth/login?returnUrl=%2Fprivada%3Ftab%3D2');
    });

    it('entra un rol incluido', async () => {
      login('PROVEEDOR');
      expect(await go('/privada')).toBe('/privada');
    });

    it('un rol no incluido va a /acceso-denegado', async () => {
      login('PRODUCTOR');
      expect(await go('/admin')).toBe('/acceso-denegado');
    });

    it('un rol incluido entra en una ruta de un solo rol', async () => {
      login('ADMIN');
      expect(await go('/admin')).toBe('/admin');
    });
  });

  describe('rutas anidadas', () => {
    it('ignora el nivel intermedio sin data.roles y comprueba la hoja', async () => {
      expect(await go('/grupo/hoja')).toBe('/auth/login?returnUrl=%2Fgrupo%2Fhoja');
    });

    it('deja pasar la hoja si el rol cuadra', async () => {
      login('ADMIN');
      expect(await go('/grupo/hoja')).toBe('/grupo/hoja');
    });

    it('un rol no incluido llega a acceso denegado desde la hoja', async () => {
      login('PROVEEDOR');
      expect(await go('/grupo/hoja')).toBe('/acceso-denegado');
    });
  });
});
