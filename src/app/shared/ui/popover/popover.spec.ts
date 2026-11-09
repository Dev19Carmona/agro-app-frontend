import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Popover, PopoverTrigger } from './popover';
import { PopoverAlign } from './popover.types';

@Component({
  imports: [Popover, PopoverTrigger],
  template: `
    <button id="outside">Fuera</button>
    <app-popover [(open)]="open" ariaLabel="Panel de prueba" [align]="align()">
      <button id="trigger" appPopoverTrigger>Abrir</button>
      <p id="content">Contenido</p>
    </app-popover>
  `,
})
class Host {
  open = signal(false);
  align = signal<PopoverAlign>('start');
}

async function settle(f: ComponentFixture<Host>) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
  f.detectChanges();
  await f.whenStable();
}

async function setup(open = false) {
  const f = TestBed.createComponent(Host);
  f.componentInstance.open.set(open);
  await settle(f);
  return f;
}

const trigger = () => document.getElementById('trigger') as HTMLButtonElement;
const panel = () => document.querySelector('[role="dialog"]') as HTMLElement | null;
const escape = () =>
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }),
  );

describe('Popover', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  it('está cerrado por defecto y el disparador declara aria-expanded=false', async () => {
    await setup();
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-controls')).toBeNull();
  });

  it('abre con clic: muestra el contenido, aria-expanded y aria-controls apuntan al panel', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    expect(panel()).not.toBeNull();
    expect(panel()!.textContent).toContain('Contenido');
    expect(panel()!.getAttribute('aria-label')).toBe('Panel de prueba');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(panel()!.id);
    expect(f.componentInstance.open()).toBe(true);
  });

  it('un segundo clic en el disparador lo cierra', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    trigger().click();
    await settle(f);
    expect(panel()).toBeNull();
    expect(f.componentInstance.open()).toBe(false);
  });

  it('al abrir, el foco pasa al panel', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    expect(document.activeElement).toBe(panel());
  });

  it('Esc cierra y devuelve el foco al disparador', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    escape();
    await settle(f);
    expect(panel()).toBeNull();
    expect(f.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('un clic fuera lo cierra', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    document.getElementById('outside')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(f);
    expect(panel()).toBeNull();
    expect(f.componentInstance.open()).toBe(false);
  });

  it('un clic dentro del panel no lo cierra', async () => {
    const f = await setup();
    trigger().click();
    await settle(f);
    document.getElementById('content')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(f);
    expect(panel()).not.toBeNull();
  });

  it('se puede abrir desde fuera con el model open', async () => {
    const f = await setup(true);
    expect(panel()).not.toBeNull();
    f.componentInstance.open.set(false);
    await settle(f);
    expect(panel()).toBeNull();
  });

  it('acepta alineación end sin romper', async () => {
    const f = await setup();
    f.componentInstance.align.set('end');
    trigger().click();
    await settle(f);
    expect(panel()).not.toBeNull();
  });
});
