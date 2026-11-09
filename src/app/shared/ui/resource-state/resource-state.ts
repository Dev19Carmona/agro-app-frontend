import { Component, input, output } from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { EmptyState } from '../empty-state/empty-state';
import { IconName } from '../icon/icon.types';
import { ResourceSkeleton, ResourceStateError } from './resource-state.types';

/**
 * Estados de una pantalla de datos: cargando, error con Reintentar, vacío o el contenido
 * proyectado. Solo se muestra uno; la prioridad es cargando, error, vacío y contenido.
 *
 * La carga reserva una altura mínima para que la pantalla no salte al llegar los datos, y se
 * anuncia con `role="status"` y `aria-busy="true"`. El error se anuncia con `role="alert"`.
 * En el vacío, lo proyectado con el atributo `emptyActions` son las acciones (p. ej. un enlace).
 *
 * Valores por defecto: `loading=false`, `error=null`, `empty=false`, `skeleton='grid'`.
 *
 * No depende de `core`: el error es cualquier objeto con `message` (p. ej. un `ApiError`).
 */
@Component({
  selector: 'app-resource-state',
  imports: [Alert, Button, EmptyState],
  template: `
    @if (loading()) {
      <div
        role="status"
        aria-busy="true"
        class="min-h-80 motion-safe:animate-pulse"
        [class]="skeleton() === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'"
      >
        <span class="sr-only">Cargando…</span>
        @if (skeleton() === 'grid') {
          @for (n of gridBlocks; track n) {
            <div class="h-40 rounded-xl bg-sunken" aria-hidden="true"></div>
          }
        } @else if (skeleton() === 'table') {
          <div class="h-10 rounded-md bg-sunken" aria-hidden="true"></div>
          @for (n of tableRows; track n) {
            <div class="h-12 rounded-md bg-sunken" aria-hidden="true"></div>
          }
        } @else {
          <div class="h-10 w-2/3 rounded-md bg-sunken" aria-hidden="true"></div>
          <div class="h-24 rounded-xl bg-sunken" aria-hidden="true"></div>
          <div class="h-48 rounded-xl bg-sunken" aria-hidden="true"></div>
        }
      </div>
    } @else if (error(); as apiError) {
      <div class="space-y-4">
        <app-alert variant="danger">{{ apiError.message }}</app-alert>
        <button app-button variant="secondary" (click)="retry.emit()">Reintentar</button>
      </div>
    } @else if (empty()) {
      <app-empty-state
        [title]="emptyTitle()"
        [description]="emptyDescription()"
        [icon]="emptyIcon()"
      >
        <ng-container ngProjectAs="[actions]"><ng-content select="[emptyActions]" /></ng-container>
      </app-empty-state>
    } @else {
      <ng-content />
    }
  `,
  host: { class: 'block' },
})
export class ResourceState {
  readonly loading = input(false);
  readonly error = input<ResourceStateError | null>(null);
  readonly empty = input(false);
  readonly emptyTitle = input('No hay resultados');
  readonly emptyDescription = input<string | null>(null);
  readonly emptyIcon = input<IconName>('inbox');
  readonly skeleton = input<ResourceSkeleton>('grid');

  /** El usuario pidió volver a cargar tras un error. */
  readonly retry = output<void>();

  protected readonly gridBlocks = [1, 2, 3, 4, 5, 6];
  protected readonly tableRows = [1, 2, 3, 4, 5];
}
