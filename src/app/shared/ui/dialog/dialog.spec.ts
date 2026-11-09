import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Dialog } from './dialog';
import { DialogVariant } from './dialog.types';

@Component({
  imports: [Dialog],
  template: `
    <button id="opener" (click)="open.set(true)">Abrir</button>
    <app-dialog
      [(open)]="open"
      title="Deshabilitar cuenta"
      description="Se cerrarán las sesiones."
      confirmLabel="Deshabilitar"
      [variant]="variant()"
      [busy]="busy()"
      (confirmed)="confirmed = confirmed + 1"
      (cancelled)="cancelled = cancelled + 1"
    >
      <p id="extra">Contenido extra</p>
    </app-dialog>
  `,
})
class Host {
  open = signal(false);
  busy = signal(false);
  variant = signal<DialogVariant>('primary');
  confirmed = 0;
  cancelled = 0;
}

async function settle(f: ComponentFixture<Host>) {
  f.detectChanges();
  await f.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
  f.detectChanges();
  await f.whenStable();
}

async function setup(open = true) {
  const f = TestBed.createComponent(Host);
  f.componentInstance.open.set(open);
  await settle(f);
  return f;
}

const escape = () =>
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }),
  );
const container = () => document.querySelector('mat-dialog-container') as HTMLElement | null;
const buttons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button'));
const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;

describe('Dialog', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  it('no se muestra mientras open es false', async () => {
    await setup(false);
    expect(container()).toBeNull();
  });

  it('muestra título, descripción y contenido proyectado', async () => {
    await setup();
    const el = container()!;
    expect(el.querySelector('h2')?.textContent).toContain('Deshabilitar cuenta');
    expect(el.textContent).toContain('Se cerrarán las sesiones.');
    expect(el.querySelector('#extra')?.textContent).toBe('Contenido extra');
  });

  it('se anuncia con título y descripción accesibles', async () => {
    await setup();
    const el = container()!;
    const labelledBy = el.getAttribute('aria-labelledby')!;
    const describedBy = el.getAttribute('aria-describedby')!;
    expect(document.getElementById(labelledBy)?.textContent).toContain('Deshabilitar cuenta');
    expect(document.getElementById(describedBy)?.textContent).toContain('Se cerrarán');
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
  });

  // jsdom no mueve el foco inicial (no calcula elementos "tabbable"): se comprueba que se pide
  // atrapar el foco y devolverlo; el comportamiento real se revisa en el navegador (demo).
  it('pide foco atrapado, foco inicial en el diálogo y devolverlo al cerrar', () => {
    const dialogs = TestBed.inject(MatDialog);
    const open = vi.spyOn(dialogs, 'open');
    const f = TestBed.createComponent(Host);
    f.componentInstance.open.set(true);
    f.detectChanges();
    const config = open.mock.calls[0][1];
    expect(config?.autoFocus).toBe('first-tabbable');
    expect(config?.restoreFocus).toBe(true);
    expect(config?.ariaModal).toBe(true);
  });

  it('confirmar emite confirmed y no cierra', async () => {
    const f = await setup();
    byText('Deshabilitar').click();
    await settle(f);
    expect(f.componentInstance.confirmed).toBe(1);
    expect(f.componentInstance.open()).toBe(true);
    expect(container()).not.toBeNull();
  });

  it('Cancelar cierra y emite cancelled sin confirmar', async () => {
    const f = await setup();
    byText('Cancelar').click();
    await settle(f);
    expect(f.componentInstance.cancelled).toBe(1);
    expect(f.componentInstance.confirmed).toBe(0);
    expect(f.componentInstance.open()).toBe(false);
  });

  it('Esc cierra y emite cancelled', async () => {
    const f = await setup();
    escape();
    await settle(f);
    await new Promise((resolve) => setTimeout(resolve, 300));
    f.detectChanges();
    expect(f.componentInstance.open()).toBe(false);
    expect(f.componentInstance.cancelled).toBe(1);
  });

  it('cerrar desde fuera (open=false) no emite cancelled', async () => {
    const f = await setup();
    f.componentInstance.open.set(false);
    await settle(f);
    expect(f.componentInstance.cancelled).toBe(0);
  });

  it('con busy deshabilita los botones y Esc no cierra', async () => {
    const f = await setup();
    f.componentInstance.busy.set(true);
    await settle(f);
    expect(buttons().every((b) => b.disabled)).toBe(true);
    escape();
    await settle(f);
    expect(f.componentInstance.open()).toBe(true);
  });

  it('la variante danger aplica el estilo de peligro al botón de confirmar', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.variant.set('danger');
    f.componentInstance.open.set(true);
    await settle(f);
    expect(byText('Deshabilitar').classList.contains('text-danger')).toBe(true);
    expect(byText('Cancelar').classList.contains('text-danger')).toBe(false);
  });
});
