import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  it.each(['/pedidos', '/pedidos/7', '/catalogo?q=maiz', '/carrito#resumen', '/'])(
    'acepta la ruta interna %s',
    (url) => {
      expect(safeReturnUrl(url, router)).toBe(url);
    },
  );

  it.each([
    '//evil.com',
    '//evil.com/path',
    'https://evil.com',
    'http://evil.com',
    'javascript:alert(1)',
    'data:text/html,hola',
    '/\\evil.com',
    '/\\/evil.com',
    '/ok\\..\\evil',
    '/ok\r\nSet-Cookie: x=1',
    '\t//evil.com',
    ' /pedidos',
    'pedidos',
    '',
  ])('rechaza %j y usa /catalogo', (url) => {
    expect(safeReturnUrl(url, router)).toBe('/catalogo');
  });

  it.each([null, undefined, 42, {}, ['/pedidos']])('rechaza un valor que no es string: %j', (v) => {
    expect(safeReturnUrl(v, router)).toBe('/catalogo');
  });

  it('usa /catalogo si parseUrl lanza', () => {
    vi.spyOn(router, 'parseUrl').mockImplementation(() => {
      throw new Error('malformada');
    });
    expect(safeReturnUrl('/ruta', router)).toBe('/catalogo');
  });
});
