import { Component, signal } from '@angular/core';
import { Button } from '../button/button';
import { ResourceState } from './resource-state';

@Component({
  imports: [ResourceState, Button],
  template: `
    <div class="mx-auto max-w-3xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Resource state (app-resource-state)</h1>

      <section aria-labelledby="rs-grid" class="space-y-3">
        <h2 id="rs-grid" class="text-xl">Cargando (grid)</h2>
        <app-resource-state [loading]="true" skeleton="grid" />
      </section>

      <section aria-labelledby="rs-table" class="space-y-3">
        <h2 id="rs-table" class="text-xl">Cargando (table)</h2>
        <app-resource-state [loading]="true" skeleton="table" />
      </section>

      <section aria-labelledby="rs-detail" class="space-y-3">
        <h2 id="rs-detail" class="text-xl">Cargando (detail)</h2>
        <app-resource-state [loading]="true" skeleton="detail" />
      </section>

      <section aria-labelledby="rs-error" class="space-y-3">
        <h2 id="rs-error" class="text-xl">Error con Reintentar</h2>
        <app-resource-state
          [error]="{ message: 'No se pudo conectar con el servidor' }"
          (retry)="retries.update((n) => n + 1)"
        />
        <p>Reintentos: {{ retries() }}</p>
      </section>

      <section aria-labelledby="rs-empty" class="space-y-3">
        <h2 id="rs-empty" class="text-xl">Vacío con acción</h2>
        <app-resource-state
          [empty]="true"
          emptyTitle="Aún no tienes productos"
          emptyDescription="Crea el primero para empezar a vender."
        >
          <a emptyActions app-button href="/proveedor/productos/nuevo">Nuevo producto</a>
        </app-resource-state>
      </section>

      <section aria-labelledby="rs-content" class="space-y-3">
        <h2 id="rs-content" class="text-xl">Contenido</h2>
        <app-resource-state>
          <p>Contenido proyectado cuando no hay carga, error ni vacío.</p>
        </app-resource-state>
      </section>
    </div>
  `,
})
export class ResourceStateDemo {
  protected readonly retries = signal(0);
}
