import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ApiError, resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { Table } from '../../../../shared/ui/table/table';
import { TableCell } from '../../../../shared/ui/table/table-cell';
import { TableColumn } from '../../../../shared/ui/table/table.types';
import { CategoryForm } from '../../components/category-form/category-form';
import { AdminCategory } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';

/**
 * `/admin/categorias`: todas las categorías, activas e inactivas, con alta, renombrar y casilla de
 * activa (reversible, sin diálogo). Cada cambio actualiza la fila con la respuesta del backend, sin
 * recargar. Una categoría desactivada sigue visible y se puede reactivar.
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Table,
    TableCell,
    Button,
    Card,
    Alert,
    Checkbox,
    CategoryForm,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Categorías"
        description="Crea y renombra categorías, y actívalas o desactívalas."
      />

      <app-card class="space-y-3">
        <h2 class="text-xl">Nueva categoría</h2>
        <app-category-form (saved)="added($event)" />
      </app-card>

      @if (message(); as m) {
        <app-alert [variant]="m.variant">{{ m.text }}</app-alert>
      }

      <app-resource-state
        skeleton="table"
        emptyTitle="Aún no hay categorías"
        emptyDescription="Crea la primera con el formulario de arriba."
        emptyIcon="tag"
        [loading]="resource.isLoading()"
        [error]="error()"
        [empty]="items().length === 0"
        (retry)="resource.reload()"
      >
        <app-table [data]="items()" [columns]="columns">
          <ng-template appTableCell="nombre" let-row>
            @if (editingId() === category(row).id) {
              <app-category-form
                [category]="category(row)"
                (saved)="renamed($event)"
                (cancelled)="editingId.set(null)"
              />
            } @else {
              <span class="font-semibold wrap-break-word">{{ category(row).nombre }}</span>
            }
          </ng-template>
          <ng-template appTableCell="activa" let-row>
            <app-checkbox
              [checked]="category(row).activa"
              [disabled]="busyId() === category(row).id"
              (checkedChange)="toggle(category(row), $event)"
            >
              Activa<span class="sr-only"> {{ category(row).nombre }}</span>
            </app-checkbox>
          </ng-template>
          <ng-template appTableCell="id" let-row>
            @if (editingId() !== category(row).id) {
              <button
                app-button
                variant="secondary"
                size="sm"
                [ariaLabel]="'Renombrar ' + category(row).nombre"
                (click)="editingId.set(category(row).id)"
              >
                Renombrar
              </button>
            }
          </ng-template>
        </app-table>
      </app-resource-state>
    </div>
  `,
})
export class Categorias {
  private readonly api = inject(AdminApi);

  protected readonly resource = rxResource({ stream: () => this.api.listCategories() });

  /** La lista mostrada: la carga del backend, ajustada con las respuestas de cada cambio. */
  protected readonly items = linkedSignal<AdminCategory[]>(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );
  protected readonly error = computed(() => resourceApiError(this.resource.error()));

  protected readonly editingId = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly message = signal<{ variant: 'success' | 'danger'; text: string } | null>(null);

  protected readonly columns: TableColumn<AdminCategory>[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'activa', header: 'Estado' },
    { field: 'id', header: 'Acciones' },
  ];

  /** Las plantillas de celda reciben la fila como `unknown`; aquí se afirma su tipo. */
  protected category(row: unknown): AdminCategory {
    return row as AdminCategory;
  }

  protected added(category: AdminCategory): void {
    this.items.update((list) => [...list, category].sort(byName));
    this.message.set({ variant: 'success', text: `Categoría «${category.nombre}» creada.` });
  }

  protected renamed(category: AdminCategory): void {
    this.replace(category);
    this.editingId.set(null);
    this.message.set({ variant: 'success', text: `Categoría renombrada a «${category.nombre}».` });
  }

  /** Activa o desactiva; si el backend falla, la casilla vuelve a reflejar el estado guardado. */
  protected async toggle(category: AdminCategory, activa: boolean): Promise<void> {
    if (this.busyId() || activa === category.activa) {
      return;
    }
    this.busyId.set(category.id);
    this.message.set(null);
    try {
      const updated = await firstValueFrom(this.api.updateCategory(category.id, { activa }));
      this.replace(updated);
      this.message.set({
        variant: 'success',
        text: `Categoría «${updated.nombre}» ${updated.activa ? 'activada' : 'desactivada'}.`,
      });
    } catch (error) {
      this.items.update((list) => list.map((c) => (c.id === category.id ? { ...c } : c)));
      this.message.set({ variant: 'danger', text: (error as ApiError).message });
    } finally {
      this.busyId.set(null);
    }
  }

  private replace(category: AdminCategory): void {
    this.items.update((list) =>
      list.map((c) => (c.id === category.id ? category : c)).sort(byName),
    );
  }
}

function byName(a: AdminCategory, b: AdminCategory): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}
