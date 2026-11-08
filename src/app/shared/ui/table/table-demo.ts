import { Component, signal } from '@angular/core';
import { Table } from './table';
import { TableCell } from './table-cell';
import { SortState, TableColumn, TableRowEvent } from './table.types';

interface Product {
  code: string;
  name: string;
  category: string;
  quantity: number;
  status: 'Disponible' | 'Agotado';
}

const PRODUCTS: Product[] = [
  {
    code: 'f230fh0g3',
    name: 'Semilla de maíz',
    category: 'Semillas',
    quantity: 24,
    status: 'Disponible',
  },
  {
    code: 'nvklal433',
    name: 'Fertilizante NPK',
    category: 'Insumos',
    quantity: 61,
    status: 'Disponible',
  },
  {
    code: 'zz21cz3c1',
    name: 'Herbicida selectivo',
    category: 'Insumos',
    quantity: 0,
    status: 'Agotado',
  },
  {
    code: '244wgerg2',
    name: 'Semilla de frijol',
    category: 'Semillas',
    quantity: 12,
    status: 'Disponible',
  },
  {
    code: 'h456wer53',
    name: 'Aspersor manual',
    category: 'Herramientas',
    quantity: 8,
    status: 'Disponible',
  },
  {
    code: 'av2231fwg',
    name: 'Guantes de labor',
    category: 'Herramientas',
    quantity: 0,
    status: 'Agotado',
  },
  {
    code: 'bib36pfvm',
    name: 'Riego por goteo',
    category: 'Riego',
    quantity: 15,
    status: 'Disponible',
  },
];

@Component({
  selector: 'app-table-demo',
  imports: [Table, TableCell],
  templateUrl: './table-demo.html',
})
export class TableDemo {
  protected readonly products = PRODUCTS;

  protected readonly columns: TableColumn<Product>[] = [
    { field: 'code', header: 'Código' },
    { field: 'name', header: 'Nombre' },
    { field: 'category', header: 'Categoría' },
    { field: 'quantity', header: 'Cantidad' },
  ];

  protected readonly sortableColumns: TableColumn<Product>[] = [
    { field: 'code', header: 'Código', sortable: true },
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'category', header: 'Categoría', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true },
  ];

  protected readonly selectableColumns: TableColumn<Product>[] = [
    { field: 'code', header: 'Código' },
    { field: 'name', header: 'Nombre', selectable: true },
    { field: 'category', header: 'Categoría' },
    { field: 'quantity', header: 'Cantidad' },
  ];

  protected readonly cellColumns: TableColumn<Product>[] = [
    { field: 'name', header: 'Nombre' },
    { field: 'quantity', header: 'Cantidad' },
    { field: 'status', header: 'Estado' },
  ];

  protected readonly single = signal<Product | Product[] | null>(null);
  protected readonly multiple = signal<Product | Product[] | null>(null);
  protected readonly checkbox = signal<Product | Product[] | null>(null);
  protected readonly radio = signal<Product | Product[] | null>(null);
  protected readonly keyboard = signal<Product | Product[] | null>(null);
  protected readonly byColumn = signal<Product | Product[] | null>(null);
  protected readonly eventsSelection = signal<Product | Product[] | null>(null);

  protected readonly events = signal<string[]>([]);

  protected readonly presort: SortState[] = [
    { field: 'category', order: 'asc' },
    { field: 'quantity', order: 'desc' },
  ];

  protected readonly sortSingle = signal<SortState[]>([]);
  protected readonly sortMultiple = signal<SortState[]>([]);
  protected readonly sortPresort = signal<SortState[]>(this.presort);
  protected readonly sortRemovable = signal<SortState[]>([]);

  // El contexto de `appTableCell` llega como `unknown`: se estrecha aquí.
  protected statusOf(row: unknown): Product['status'] {
    return (row as Product).status;
  }

  protected isAvailable(row: unknown): boolean {
    return this.statusOf(row) === 'Disponible';
  }

  protected logEvent(type: 'seleccionada' | 'deseleccionada', event: TableRowEvent<Product>): void {
    const message = `Fila ${type}: ${event.row.name} (índice ${event.index})`;
    this.events.update((events) => [message, ...events].slice(0, 5));
  }
}
