export type TableSize = 'small' | 'medium' | 'large';
export type TableSelectionMode = 'none' | 'single' | 'multiple';
export type TableSelectionControl = 'row' | 'checkbox' | 'radio'; // cómo se selecciona
export type TableSortMode = 'none' | 'single' | 'multiple';
export type SortOrder = 'asc' | 'desc';

export interface TableColumn<T = unknown> {
  field: keyof T & string;
  header: string;
  sortable?: boolean;
  width?: string;
  selectable?: boolean; // columna que aloja el checkbox/radio de selección
}

export interface SortState {
  field: string;
  order: SortOrder;
}

export interface TableRowEvent<T> {
  row: T;
  index: number; // índice de la fila en `data`
}
