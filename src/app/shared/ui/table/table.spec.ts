import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Table } from './table';
import { TableCell } from './table-cell';
import {
  SortState,
  TableColumn,
  TableRowEvent,
  TableSelectionControl,
  TableSelectionMode,
  TableSize,
  TableSortMode,
} from './table.types';

interface Item {
  name: string;
  category: string;
  qty: number;
}

const ITEMS: Item[] = [
  { name: 'Maíz', category: 'Semillas', qty: 30 },
  { name: 'Abono', category: 'Insumos', qty: 10 },
  { name: 'Frijol', category: 'Semillas', qty: 20 },
];

@Component({
  imports: [Table, TableCell],
  template: `
    <app-table
      [data]="data"
      [columns]="columns()"
      [size]="size()"
      [showGridlines]="gridlines()"
      [striped]="striped()"
      [selectionMode]="selectionMode()"
      [selectionControl]="selectionControl()"
      [keyboardSelection]="keyboard()"
      [sortMode]="sortMode()"
      [removableSort]="removable()"
      [(selection)]="selection"
      [(sort)]="sort"
      (rowSelect)="selected.push($event)"
      (rowUnselect)="unselected.push($event)"
      (sortChange)="sortEvents.push($event)"
    >
      @if (customCell()) {
        <ng-template appTableCell="name" let-row let-column="column">
          <b class="custom" [attr.data-column]="column">{{ $any(row).name }}!</b>
        </ng-template>
      }
    </app-table>
  `,
})
class Host {
  readonly data = ITEMS;
  readonly columns = signal<TableColumn<Item>[]>([
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'category', header: 'Categoría', sortable: true },
    { field: 'qty', header: 'Cantidad', sortable: true },
  ]);
  readonly size = signal<TableSize>('medium');
  readonly gridlines = signal(false);
  readonly striped = signal(false);
  readonly selectionMode = signal<TableSelectionMode>('none');
  readonly selectionControl = signal<TableSelectionControl>('row');
  readonly keyboard = signal(true);
  readonly sortMode = signal<TableSortMode>('none');
  readonly removable = signal(false);
  readonly customCell = signal(false);
  readonly selection = signal<Item | Item[] | null>(null);
  readonly sort = signal<SortState[]>([]);

  readonly selected: TableRowEvent<Item>[] = [];
  readonly unselected: TableRowEvent<Item>[] = [];
  readonly sortEvents: SortState[][] = [];
}

describe('Table', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const rows = () => Array.from(el.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  const rowNames = () => rows().map((row) => row.querySelector('td')?.textContent?.trim());
  const headerButton = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('thead th button')).find((button) =>
      button.textContent?.includes(label),
    );
  const headerCell = (label: string) =>
    Array.from(el.querySelectorAll<HTMLTableCellElement>('thead th')).find((th) =>
      th.textContent?.includes(label),
    );
  const pressKey = (target: Element, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { code: key, key, bubbles: true }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  describe('render', () => {
    it('muestra cabeceras y filas a partir de data y columns', async () => {
      await render();
      const headers = Array.from(el.querySelectorAll('thead th')).map((th) =>
        th.textContent?.trim(),
      );
      expect(headers).toEqual(['Nombre', 'Categoría', 'Cantidad']);
      expect(rows().length).toBe(3);
      expect(rows()[0].textContent).toContain('Maíz');
      expect(rows()[0].textContent).toContain('Semillas');
    });

    it('renderiza el template del consumidor con appTableCell', async () => {
      host.customCell.set(true);
      await render();
      const custom = el.querySelectorAll('tbody b.custom');
      expect(custom.length).toBe(3);
      expect(custom[0].textContent).toBe('Maíz!');
      expect(custom[0].getAttribute('data-column')).toBe('name');
      expect(rows()[0].textContent).toContain('Semillas');
    });
  });

  describe('variantes', () => {
    it('aplica size small y large (medium no añade clase)', async () => {
      await render();
      const table = () => el.querySelector('table.app-table') as HTMLElement;
      expect(table().className).not.toMatch(/app-table-(small|large)/);

      host.size.set('small');
      await render();
      expect(table().className).toContain('app-table-small');

      host.size.set('large');
      await render();
      expect(table().className).toContain('app-table-large');
    });

    it('showGridlines y striped añaden sus clases', async () => {
      await render();
      const table = el.querySelector('table.app-table') as HTMLElement;
      expect(table.className).not.toContain('app-table-gridlines');
      expect(table.className).not.toContain('app-table-striped');

      host.gridlines.set(true);
      host.striped.set(true);
      await render();
      expect(table.className).toContain('app-table-gridlines');
      expect(table.className).toContain('app-table-striped');
    });
  });

  describe('selección', () => {
    it('single: clic en fila actualiza selection y emite rowSelect', async () => {
      host.selectionMode.set('single');
      await render();
      rows()[1].click();
      await render();
      expect(host.selection()).toBe(ITEMS[1]);
      expect(host.selected).toEqual([{ row: ITEMS[1], index: 1 }]);
    });

    it('quitar la fila seleccionada emite rowUnselect', async () => {
      host.selectionMode.set('single');
      await render();
      rows()[0].click();
      await render();
      rows()[0].click();
      await render();
      expect(host.selection()).toBeNull();
      expect(host.unselected).toEqual([{ row: ITEMS[0], index: 0 }]);
    });

    it('multiple con checkbox: varias filas y checkbox de cabecera', async () => {
      host.selectionMode.set('multiple');
      host.selectionControl.set('checkbox');
      await render();
      expect(el.querySelectorAll('thead mat-checkbox').length).toBe(1);

      const boxes = el.querySelectorAll<HTMLInputElement>('tbody mat-checkbox input');
      expect(boxes.length).toBe(3);
      boxes[0].click();
      await render();
      boxes[2].click();
      await render();
      expect(host.selection()).toEqual([ITEMS[0], ITEMS[2]]);
      expect(host.selected.length).toBe(2);

      boxes[0].click();
      await render();
      expect(host.selection()).toEqual([ITEMS[2]]);
      expect(host.unselected).toEqual([{ row: ITEMS[0], index: 0 }]);
    });

    it('checkbox de cabecera selecciona todas las filas', async () => {
      host.selectionMode.set('multiple');
      host.selectionControl.set('checkbox');
      await render();
      el.querySelector<HTMLInputElement>('thead mat-checkbox input')?.click();
      await render();
      expect(host.selection()).toEqual(ITEMS);
    });

    it('radio: solo una fila queda seleccionada', async () => {
      host.selectionMode.set('single');
      host.selectionControl.set('radio');
      await render();
      const radios = el.querySelectorAll<HTMLInputElement>('tbody mat-radio-button input');
      expect(radios.length).toBe(3);
      radios[0].click();
      await render();
      radios[2].click();
      await render();
      expect(host.selection()).toBe(ITEMS[2]);
      expect(Array.from(radios).filter((radio) => radio.checked).length).toBe(1);
    });

    it('selectable por columna: el control va en esa columna y no hay columna extra', async () => {
      host.selectionMode.set('multiple');
      host.selectionControl.set('checkbox');
      host.columns.set([
        { field: 'name', header: 'Nombre' },
        { field: 'category', header: 'Categoría', selectable: true },
      ]);
      await render();
      expect(el.querySelectorAll('thead th').length).toBe(2);
      const cells = rows()[0].querySelectorAll('td');
      expect(cells[0].querySelector('mat-checkbox')).toBeNull();
      expect(cells[1].querySelector('mat-checkbox')).not.toBeNull();
    });

    it('sin columna selectable el control usa una columna extra al inicio', async () => {
      host.selectionMode.set('multiple');
      host.selectionControl.set('checkbox');
      await render();
      expect(el.querySelectorAll('thead th').length).toBe(4);
      expect(rows()[0].querySelector('td')?.querySelector('mat-checkbox')).not.toBeNull();
    });

    it('teclado: las flechas mueven el foco y Enter/Espacio seleccionan', async () => {
      host.selectionMode.set('multiple');
      await render();
      const [first, second] = rows();
      first.focus();
      pressKey(first, 'ArrowDown');
      expect(document.activeElement).toBe(second);

      pressKey(second, 'Enter');
      await render();
      expect(host.selection()).toEqual([ITEMS[1]]);

      pressKey(first, 'Space');
      await render();
      expect(host.selection()).toEqual([ITEMS[1], ITEMS[0]]);
    });

    it('keyboardSelection=false bloquea la navegación y la selección por teclado', async () => {
      host.selectionMode.set('multiple');
      host.keyboard.set(false);
      await render();
      const [first, second] = rows();
      first.focus();
      pressKey(first, 'ArrowDown');
      pressKey(first, 'Enter');
      await render();
      expect(document.activeElement).not.toBe(second);
      expect(host.selection()).toBeNull();

      first.click();
      await render();
      expect(host.selection()).toEqual([ITEMS[0]]);
    });
  });

  describe('orden', () => {
    it('sortMode none: las cabeceras no son ordenables', async () => {
      await render();
      expect(el.querySelectorAll('thead th button').length).toBe(0);
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBeNull();
    });

    it('single: clic ordena, expone aria-sort y emite sortChange', async () => {
      host.sortMode.set('single');
      await render();
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBe('none');

      headerButton('Nombre')?.click();
      await render();
      expect(rowNames()).toEqual(['Abono', 'Frijol', 'Maíz']);
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBe('ascending');
      expect(host.sort()).toEqual([{ field: 'name', order: 'asc' }]);
      expect(host.sortEvents.at(-1)).toEqual([{ field: 'name', order: 'asc' }]);

      headerButton('Nombre')?.click();
      await render();
      expect(rowNames()).toEqual(['Maíz', 'Frijol', 'Abono']);
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('single: ordenar otra columna reemplaza el orden anterior', async () => {
      host.sortMode.set('single');
      await render();
      headerButton('Nombre')?.click();
      await render();
      headerButton('Cantidad')?.click();
      await render();
      expect(host.sort()).toEqual([{ field: 'qty', order: 'asc' }]);
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBe('none');
      expect(rowNames()).toEqual(['Abono', 'Frijol', 'Maíz']);
    });

    it('multiple: ordena por varias columnas a la vez', async () => {
      host.sortMode.set('multiple');
      await render();
      headerButton('Categoría')?.click();
      await render();
      headerButton('Cantidad')?.click();
      await render();
      headerButton('Cantidad')?.click();
      await render();
      expect(host.sort()).toEqual([
        { field: 'category', order: 'asc' },
        { field: 'qty', order: 'desc' },
      ]);
      expect(rowNames()).toEqual(['Abono', 'Maíz', 'Frijol']);
      expect(headerCell('Categoría')?.getAttribute('aria-sort')).toBe('ascending');
      expect(headerCell('Cantidad')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('presort: un valor inicial en sort se aplica al renderizar', async () => {
      host.sortMode.set('single');
      host.sort.set([{ field: 'qty', order: 'desc' }]);
      await render();
      expect(rowNames()).toEqual(['Maíz', 'Frijol', 'Abono']);
      expect(headerCell('Cantidad')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('removableSort: un tercer clic quita el orden', async () => {
      host.sortMode.set('single');
      host.removable.set(true);
      await render();
      const button = headerButton('Nombre');
      button?.click();
      await render();
      button?.click();
      await render();
      button?.click();
      await render();
      expect(host.sort()).toEqual([]);
      expect(rowNames()).toEqual(['Maíz', 'Abono', 'Frijol']);
      expect(headerCell('Nombre')?.getAttribute('aria-sort')).toBe('none');
    });

    it('sin removableSort el tercer clic vuelve a ascendente', async () => {
      host.sortMode.set('single');
      await render();
      const button = headerButton('Nombre');
      button?.click();
      await render();
      button?.click();
      await render();
      button?.click();
      await render();
      expect(host.sort()).toEqual([{ field: 'name', order: 'asc' }]);
    });

    it('no muta el array data del consumidor', async () => {
      host.sortMode.set('single');
      await render();
      headerButton('Nombre')?.click();
      await render();
      expect(host.data.map((item) => item.name)).toEqual(['Maíz', 'Abono', 'Frijol']);
    });
  });
});
