import { SelectionModel } from '@angular/cdk/collections';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChildren, input, model, output, signal } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatRadioButton } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { TableCell } from './table-cell';
import {
  SortOrder,
  SortState,
  TableColumn,
  TableRowEvent,
  TableSelectionControl,
  TableSelectionMode,
  TableSize,
  TableSortMode,
} from './table.types';

let nextId = 0;

const SELECT_COLUMN = '__select';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b);
  return a < b ? -1 : a > b ? 1 : 0;
}

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatCheckbox, MatRadioButton, NgTemplateOutlet],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table<T = unknown> {
  readonly data = input<T[]>([]);
  readonly columns = input<TableColumn<T>[]>([]);
  readonly size = input<TableSize>('medium');
  readonly showGridlines = input(false);
  readonly striped = input(false);

  readonly selectionMode = input<TableSelectionMode>('none');
  readonly selectionControl = input<TableSelectionControl>('row');
  readonly keyboardSelection = input(true);

  /** `T` con selección única (`'single'` o `selectionControl='radio'`); `T[]` con `'multiple'`. */
  readonly selection = model<T | T[] | null>(null);

  readonly sortMode = input<TableSortMode>('none');
  readonly removableSort = input(false);

  /**
   * Estado de orden; el valor inicial actúa como presort. En modo `single` solo cuenta el primero.
   * Al ser un `model()`, Angular ya expone el output `sortChange` con cada cambio.
   */
  readonly sort = model<SortState[]>([]);

  readonly rowSelect = output<TableRowEvent<T>>();
  readonly rowUnselect = output<TableRowEvent<T>>();

  private readonly cells = contentChildren(TableCell);

  protected readonly radioName = `app-table-radio-${nextId++}`;
  protected readonly focusedIndex = signal(0);

  protected readonly cellTemplates = computed(
    () => new Map(this.cells().map((cell) => [cell.field(), cell.template])),
  );

  protected readonly tableClasses = computed(() =>
    [
      `app-table-${this.size()}`,
      this.showGridlines() ? 'app-table-gridlines' : '',
      this.striped() ? 'app-table-striped' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  // --- Selección ---

  /** Checkbox implica selección múltiple y radio selección única. */
  private readonly multipleSelection = computed(() => {
    switch (this.selectionControl()) {
      case 'checkbox':
        return true;
      case 'radio':
        return false;
      default:
        return this.selectionMode() === 'multiple';
    }
  });

  /** La fila entera es seleccionable (clic y teclado) solo con control `row`. */
  protected readonly rowSelectable = computed(
    () => this.selectionMode() !== 'none' && this.selectionControl() === 'row',
  );

  protected readonly hasControl = computed(
    () => this.selectionMode() !== 'none' && this.selectionControl() !== 'row',
  );

  /** Columna que aloja el checkbox/radio (la primera con `selectable`). */
  protected readonly controlField = computed(() =>
    this.hasControl() ? this.columns().find((col) => col.selectable)?.field : undefined,
  );

  /** Si ninguna columna es `selectable`, el control va en una columna extra al inicio. */
  protected readonly extraControlColumn = computed(
    () => this.hasControl() && this.controlField() === undefined,
  );

  protected readonly displayedColumns = computed<string[]>(() => [
    ...(this.extraControlColumn() ? [SELECT_COLUMN] : []),
    ...this.columns().map((col) => col.field),
  ]);

  protected readonly selectColumn = SELECT_COLUMN;

  private readonly selectedRows = computed<T[]>(() => {
    const selection = this.selection();
    if (selection == null) return [];
    return Array.isArray(selection) ? selection : [selection];
  });

  protected readonly allSelected = computed(() => {
    const data = this.data();
    const selected = this.selectedRows();
    return data.length > 0 && data.every((row) => selected.includes(row));
  });

  protected readonly someSelected = computed(
    () => this.selectedRows().length > 0 && !this.allSelected(),
  );

  protected isSelected(row: T): boolean {
    return this.selectedRows().includes(row);
  }

  protected toggleRow(row: T): void {
    this.applySelection((model) => model.toggle(row));
  }

  protected selectRow(row: T): void {
    this.applySelection((model) => model.select(row));
  }

  protected toggleAll(): void {
    const all = this.allSelected();
    this.applySelection((model) => (all ? model.clear() : model.select(...this.data())));
  }

  protected onRowClick(row: T): void {
    if (this.rowSelectable()) this.toggleRow(row);
  }

  protected rowTabindex(index: number): number | null {
    if (!this.rowSelectable() || !this.keyboardSelection()) return null;
    const last = Math.max(this.data().length - 1, 0);
    return index === Math.min(this.focusedIndex(), last) ? 0 : -1;
  }

  /** Flechas, Inicio/Fin mueven el foco; Enter y Espacio seleccionan la fila. */
  protected onRowKeydown(event: KeyboardEvent, row: T): void {
    if (!this.rowSelectable() || !this.keyboardSelection()) return;
    // Ignora teclas que vienen de controles internos (por ejemplo un input en una celda).
    if (event.target !== event.currentTarget) return;
    const current = event.currentTarget as HTMLElement;
    let target: Element | null | undefined;
    switch (event.code) {
      case 'ArrowDown':
        target = current.nextElementSibling;
        break;
      case 'ArrowUp':
        target = current.previousElementSibling;
        break;
      case 'Home':
        target = current.parentElement?.firstElementChild;
        break;
      case 'End':
        target = current.parentElement?.lastElementChild;
        break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space':
        this.toggleRow(row);
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (target instanceof HTMLElement) target.focus();
  }

  /** Aplica el cambio con un `SelectionModel` efímero y emite un evento por fila afectada. */
  private applySelection(mutate: (model: SelectionModel<T>) => void): void {
    const multiple = this.multipleSelection();
    const current = this.selectedRows();
    const model = new SelectionModel<T>(multiple, multiple ? current : current.slice(0, 1));
    model.changed.subscribe((change) => {
      for (const row of change.removed) this.rowUnselect.emit(this.rowEvent(row));
      for (const row of change.added) this.rowSelect.emit(this.rowEvent(row));
    });
    mutate(model);
    this.selection.set(multiple ? model.selected : (model.selected[0] ?? null));
  }

  private rowEvent(row: T): TableRowEvent<T> {
    return { row, index: this.data().indexOf(row) };
  }

  // --- Orden ---

  private readonly activeSort = computed<SortState[]>(() => {
    const mode = this.sortMode();
    if (mode === 'none') return [];
    const sort = this.sort();
    return mode === 'single' ? sort.slice(0, 1) : sort;
  });

  /** Copia ordenada: el orden lo resuelve el wrapper y nunca muta el `data` del consumidor. */
  protected readonly sortedData = computed(() => {
    const data = this.data();
    const sort = this.activeSort();
    if (sort.length === 0) return data;
    return [...data].sort((a, b) => {
      for (const { field, order } of sort) {
        const result = compareValues(this.cellValue(a, field), this.cellValue(b, field));
        if (result !== 0) return order === 'asc' ? result : -result;
      }
      return 0;
    });
  });

  protected cellValue(row: T, field: string): unknown {
    return (row as Record<string, unknown>)[field];
  }

  protected isSortable(col: TableColumn<T>): boolean {
    return this.sortMode() !== 'none' && !!col.sortable;
  }

  protected sortOrder(field: string): SortOrder | null {
    return this.activeSort().find((s) => s.field === field)?.order ?? null;
  }

  protected ariaSort(field: string): 'ascending' | 'descending' | 'none' {
    const order = this.sortOrder(field);
    return order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : 'none';
  }

  /** Posición (1-based) de la columna en el orden múltiple; `null` si no aplica. */
  protected sortPriority(field: string): number | null {
    const sort = this.activeSort();
    if (this.sortMode() !== 'multiple' || sort.length < 2) return null;
    const index = sort.findIndex((s) => s.field === field);
    return index === -1 ? null : index + 1;
  }

  /** Ciclo por columna: asc → desc → (quitar si `removableSort`) o vuelta a asc. */
  protected toggleSort(field: string): void {
    const current = this.activeSort();
    const currentOrder = current.find((s) => s.field === field)?.order;
    let next: SortOrder | null;
    if (currentOrder === undefined) next = 'asc';
    else if (currentOrder === 'asc') next = 'desc';
    else next = this.removableSort() ? null : 'asc';

    let result: SortState[];
    if (this.sortMode() === 'single') {
      result = next ? [{ field, order: next }] : [];
    } else if (next === null) {
      result = current.filter((s) => s.field !== field);
    } else if (currentOrder === undefined) {
      result = [...current, { field, order: next }];
    } else {
      result = current.map((s) => (s.field === field ? { field, order: next } : s));
    }
    this.sort.set(result);
  }
}
