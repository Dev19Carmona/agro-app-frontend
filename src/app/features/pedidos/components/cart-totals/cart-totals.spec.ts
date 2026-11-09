import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartTotals } from './cart-totals';

@Component({
  imports: [CartTotals],
  template: `<app-cart-totals
    [total]="total"
    [lines]="lines"
    [blocked]="blocked"
    [busy]="busy"
    (clear)="cleared = cleared + 1"
    (proceed)="proceeded = proceeded + 1"
  />`,
})
class Host {
  total = 75000;
  lines = 2;
  blocked = false;
  busy = false;
  cleared = 0;
  proceeded = 0;
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as
      | HTMLButtonElement
      | undefined;
  return { host: fixture.componentInstance, root, button };
}

describe('CartTotals', () => {
  it('muestra el total estimado con formatCop y el número de líneas', () => {
    const { root } = setup();
    expect(root.textContent).toContain('$ 75.000');
    expect(root.textContent).toContain('2 líneas');
  });

  it('emite clear y proceed', () => {
    const { host, button } = setup();
    button('Vaciar carrito')?.click();
    button('Continuar')?.click();
    expect(host.cleared).toBe(1);
    expect(host.proceeded).toBe(1);
  });

  it('Continuar queda deshabilitado con líneas no aptas', () => {
    const { button } = setup({ blocked: true });
    expect(button('Continuar')?.disabled).toBe(true);
    expect(button('Vaciar carrito')?.disabled).toBe(false);
  });

  it('con el carrito vacío no se puede continuar ni vaciar', () => {
    const { button } = setup({ lines: 0, total: 0 });
    expect(button('Continuar')?.disabled).toBe(true);
    expect(button('Vaciar carrito')?.disabled).toBe(true);
  });

  it('con busy deshabilita ambos botones', () => {
    const { button } = setup({ busy: true });
    expect(button('Continuar')?.disabled).toBe(true);
    expect(button('Vaciar carrito')?.disabled).toBe(true);
  });
});
