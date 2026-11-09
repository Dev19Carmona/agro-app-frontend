import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { PublicCategory } from '../../../../core/catalog';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { FiltersValue } from '../../models/catalogo.types';
import { MUNICIPIO_MAX_LENGTH } from '../../utils/filter-params';

/**
 * Filtros del catálogo: categoría (lista) y municipio (texto). Es un componente de presentación:
 * recibe los valores aplicados (los de la URL) y emite `filtersChange` con el conjunto completo.
 *
 * - Elegir una categoría aplica los filtros al instante.
 * - El municipio se aplica con "Filtrar" o con Intro, para no pedir datos a cada tecla.
 * - "Limpiar" aparece solo si hay algún filtro aplicado.
 *
 * Sin `categories` (directorio de tiendas) no se muestra el selector de categoría.
 * Valores por defecto: `categories=null`, `categoryId=''`, `municipio=''`.
 */
@Component({
  selector: 'app-catalogo-filters',
  imports: [Button, Input, Select],
  template: `
    <form
      aria-label="Filtros"
      class="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] sm:items-start"
      (submit)="$event.preventDefault(); apply()"
    >
      @if (categories(); as list) {
        <app-select
          label="Categoría"
          [options]="categoryOptions()"
          [value]="categoryDraft()"
          (valueChange)="onCategory($event)"
        />
      }
      <app-input
        label="Municipio"
        autocomplete="off"
        [value]="municipioDraft()"
        (valueChange)="municipioDraft.set('' + ($event ?? ''))"
      />
      <div class="flex flex-wrap gap-2 sm:col-span-full">
        <button app-button type="submit">Filtrar</button>
        @if (hasFilters()) {
          <button app-button type="button" variant="secondary" (click)="clear()">Limpiar</button>
        }
      </div>
    </form>
  `,
  host: { class: 'block' },
})
export class CatalogoFilters {
  readonly categories = input<PublicCategory[] | null>(null);
  readonly categoryId = input('');
  readonly municipio = input('');

  readonly filtersChange = output<FiltersValue>();

  /** Borradores: se reinician cuando cambian los valores aplicados (Atrás, enlace compartido…). */
  protected readonly categoryDraft = linkedSignal(() => this.categoryId());
  protected readonly municipioDraft = linkedSignal(() => this.municipio());

  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las categorías' },
    ...(this.categories() ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  ]);

  protected readonly hasFilters = computed(() => !!this.categoryId() || !!this.municipio());

  protected onCategory(value: string): void {
    // El select emite al enlazarse el valor inicial; solo cuenta un cambio real.
    if (value === this.categoryDraft()) {
      return;
    }
    this.categoryDraft.set(value);
    this.apply();
  }

  protected apply(): void {
    const municipio = this.municipioDraft().trim().slice(0, MUNICIPIO_MAX_LENGTH).trim();
    const categoryId = this.categories() ? this.categoryDraft() : '';
    this.filtersChange.emit({
      ...(categoryId && { categoryId }),
      ...(municipio && { municipio }),
    });
  }

  protected clear(): void {
    this.categoryDraft.set('');
    this.municipioDraft.set('');
    this.filtersChange.emit({});
  }
}
