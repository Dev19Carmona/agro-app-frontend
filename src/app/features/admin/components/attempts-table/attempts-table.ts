import { Component, input } from '@angular/core';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { PaymentAttempt } from '../../models/admin.types';
import { formatDateTime } from '../../utils/format';

/** Historial de intentos de cobro de un pago: origen y resultado se muestran tal cual. */
@Component({
  selector: 'app-attempts-table',
  imports: [Table, TableCell],
  template: `
    <app-table [data]="attempts()" [columns]="columns">
      <ng-template appTableCell="createdAt" let-row>
        {{ date(attempt(row).createdAt) }}
      </ng-template>
      <ng-template appTableCell="motivo" let-row>
        {{ attempt(row).motivo ?? '—' }}
      </ng-template>
    </app-table>
  `,
  host: { class: 'block' },
})
export class AttemptsTable {
  readonly attempts = input.required<PaymentAttempt[]>();

  protected readonly date = formatDateTime;
  protected readonly columns: TableColumn<PaymentAttempt>[] = [
    { field: 'createdAt', header: 'Fecha' },
    { field: 'origen', header: 'Origen' },
    { field: 'resultado', header: 'Resultado' },
    { field: 'motivo', header: 'Motivo' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected attempt(row: unknown): PaymentAttempt {
    return row as PaymentAttempt;
  }
}
