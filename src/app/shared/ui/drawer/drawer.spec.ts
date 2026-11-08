import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drawer } from './drawer';
import { DrawerSide } from './drawer.types';

@Component({
  imports: [Drawer],
  template: `
    <button id="outside">Abrir</button>
    <app-drawer [(open)]="open" [side]="side()" label="Navegación principal">
      <nav drawerPanel>
        <a id="first" href="/catalogo">Catálogo</a>
        <a href="/pedidos">Pedidos</a>
      </nav>
      <main id="page">Contenido</main>
    </app-drawer>
  `,
})
class Host {
  open = signal(false);
  side = signal<DrawerSide>('end');
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const sidenav = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('mat-sidenav') as HTMLElement;

/** Material emite los eventos de apertura/cierre con `setTimeout`: se espera un macrotask. */
async function flush(f: ComponentFixture<Host>) {
  f.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  f.detectChanges();
  await f.whenStable();
}

describe('Drawer', () => {
  it('proyecta el contenido de la página y el panel en su sitio', async () => {
    const f = await setup();
    expect(f.nativeElement.querySelector('mat-sidenav-content #page')?.textContent).toBe(
      'Contenido',
    );
    expect(sidenav(f).querySelector('nav')).not.toBeNull();
  });

  it('está cerrado al inicio', async () => {
    const f = await setup();
    expect(f.componentInstance.open()).toBe(false);
    expect(sidenav(f).classList.contains('mat-drawer-opened')).toBe(false);
  });

  it('se expone como diálogo modal con nombre accesible', async () => {
    const f = await setup();
    const el = sidenav(f);
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Navegación principal');
  });

  it('abre al poner open en true', async () => {
    const f = await setup();
    f.componentInstance.open.set(true);
    await flush(f);
    expect(sidenav(f).classList.contains('mat-drawer-opened')).toBe(true);
  });

  it('cierra al hacer clic en el fondo y actualiza el modelo', async () => {
    const f = await setup();
    f.componentInstance.open.set(true);
    await flush(f);
    (f.nativeElement.querySelector('.mat-drawer-backdrop') as HTMLElement).click();
    await flush(f);
    expect(f.componentInstance.open()).toBe(false);
  });

  it('cierra con Escape y actualiza el modelo', async () => {
    const f = await setup();
    f.componentInstance.open.set(true);
    await flush(f);
    sidenav(f).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await flush(f);
    expect(f.componentInstance.open()).toBe(false);
  });

  it('el lado por defecto es end y side=start lo cambia', async () => {
    const f = await setup();
    expect(sidenav(f).classList.contains('mat-drawer-end')).toBe(true);
    f.componentInstance.side.set('start');
    await flush(f);
    expect(sidenav(f).classList.contains('mat-drawer-end')).toBe(false);
  });
});
