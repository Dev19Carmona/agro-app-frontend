import { Directive, TemplateRef, inject, input } from '@angular/core';

export interface TableCellContext<T = unknown> {
  $implicit: T;
  column: string;
}

/**
 * Marca un `ng-template` como plantilla de celda para la columna indicada.
 * Uso: `<ng-template appTableCell="name" let-row let-column="column">…</ng-template>`
 */
@Directive({ selector: 'ng-template[appTableCell]' })
export class TableCell {
  readonly field = input.required<string>({ alias: 'appTableCell' });
  readonly template = inject<TemplateRef<TableCellContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: TableCell, _ctx: unknown): _ctx is TableCellContext {
    return true;
  }
}
