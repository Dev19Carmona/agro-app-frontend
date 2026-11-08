import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Menu } from './menu';
import { MenuAlign, MenuItem } from './menu.types';

const ITEMS: MenuItem[] = [
  { id: 'productor', label: 'Productor', icon: 'user' },
  { id: 'proveedor', label: 'Proveedor', icon: 'store' },
  { id: 'admin', label: 'Administrador', disabled: true, dividerBefore: true },
];

@Component({
  imports: [Menu],
  template: `
    <app-menu
      label="Rol de demo"
      [items]="items"
      [iconOnly]="iconOnly()"
      [icon]="iconOnly() ? 'user' : null"
      [selectable]="selectable()"
      [selectedId]="selected()"
      [align]="align()"
      (itemSelect)="picked.push($event)"
    />
  `,
})
class Host {
  items = ITEMS;
  iconOnly = signal(false);
  selectable = signal(false);
  selected = signal<string | null>(null);
  align = signal<MenuAlign>('start');
  picked: string[] = [];
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const trigger = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('button[app-button]') as HTMLButtonElement;

async function open(f: ComponentFixture<Host>) {
  trigger(f).click();
  f.detectChanges();
  await f.whenStable();
}

const panel = () => document.querySelector('[role="menu"]') as HTMLElement | null;
const items = () => Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]'));

describe('Menu', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  it('muestra el texto del botón y está cerrado al inicio', async () => {
    const f = await setup();
    expect(trigger(f).textContent).toContain('Rol de demo');
    expect(trigger(f).getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger(f).getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('al pulsar el botón abre el panel con los ítems y su etiqueta accesible', async () => {
    const f = await setup();
    await open(f);
    expect(trigger(f).getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.getAttribute('aria-label')).toBe('Rol de demo');
    expect(items().map((el) => el.textContent?.trim())).toEqual([
      'Productor',
      'Proveedor',
      'Administrador',
    ]);
  });

  it('emite el id del ítem elegido y cierra el menú', async () => {
    const f = await setup();
    await open(f);
    items()[1].click();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.picked).toEqual(['proveedor']);
    expect(trigger(f).getAttribute('aria-expanded')).toBe('false');
  });

  it('un ítem deshabilitado no emite', async () => {
    const f = await setup();
    await open(f);
    items()[2].click();
    expect(f.componentInstance.picked).toEqual([]);
    expect((items()[2] as HTMLButtonElement).disabled).toBe(true);
  });

  it('pinta el separador antes del ítem que lo pide', async () => {
    const f = await setup();
    await open(f);
    expect(document.querySelectorAll('[role="separator"]').length).toBe(1);
  });

  it('sin selectable los ítems son menuitem y sin aria-checked', async () => {
    const f = await setup();
    await open(f);
    for (const el of items()) {
      expect(el.getAttribute('role')).toBe('menuitem');
      expect(el.hasAttribute('aria-checked')).toBe(false);
    }
  });

  it('con selectable los ítems son menuitemradio y marca el seleccionado', async () => {
    const f = await setup();
    f.componentInstance.selectable.set(true);
    f.componentInstance.selected.set('proveedor');
    f.detectChanges();
    await open(f);
    const [a, b] = items();
    expect(a.getAttribute('role')).toBe('menuitemradio');
    expect(a.getAttribute('aria-checked')).toBe('false');
    expect(b.getAttribute('aria-checked')).toBe('true');
    expect(b.querySelectorAll('app-icon').length).toBe(2); // su icono + el check
    expect(a.querySelectorAll('app-icon').length).toBe(1); // solo su icono, sin check
  });

  it('con iconOnly el botón no muestra texto y usa label como aria-label', async () => {
    const f = await setup();
    f.componentInstance.iconOnly.set(true);
    f.detectChanges();
    const btn = trigger(f);
    expect(btn.getAttribute('aria-label')).toBe('Rol de demo');
    expect(btn.textContent?.trim()).toBe('');
    expect(btn.classList.contains('size-10')).toBe(true);
  });

  it('ariaLabel da nombre accesible al botón con texto sin cambiar el texto visible', async () => {
    @Component({
      imports: [Menu],
      template: `<app-menu label="Productor" ariaLabel="Rol de demo: Productor" [items]="items" />`,
    })
    class WithAria {
      items = ITEMS;
    }
    const f = TestBed.createComponent(WithAria);
    f.detectChanges();
    const btn = f.nativeElement.querySelector('button[app-button]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Rol de demo: Productor');
    expect(btn.textContent).toContain('Productor');
  });

  it('cierra con Escape y devuelve el foco al botón', async () => {
    const f = await setup();
    await open(f);
    panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    f.detectChanges();
    await f.whenStable();
    // En jsdom el panel sigue en el DOM hasta que termina la animación de salida.
    expect(trigger(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger(f));
  });

  it('align=end abre el menú hacia el lado contrario sin romper', async () => {
    const f = await setup();
    f.componentInstance.align.set('end');
    f.detectChanges();
    await open(f);
    expect(panel()).not.toBeNull();
  });
});
