import { Component, signal } from '@angular/core';
import { Pagination } from './pagination';

@Component({
  imports: [Pagination],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Paginación (app-pagination)</h1>

      <section aria-labelledby="pag-many" class="space-y-3">
        <h2 id="pag-many" class="text-xl">Muchas páginas</h2>
        <p class="text-fg-muted">Página actual: {{ many() }} de 20.</p>
        <app-pagination
          [(page)]="many"
          [totalPages]="20"
          ariaLabel="Paginación de muchas páginas"
        />
      </section>

      <section aria-labelledby="pag-few" class="space-y-3">
        <h2 id="pag-few" class="text-xl">Pocas páginas</h2>
        <p class="text-fg-muted">Página actual: {{ few() }} de 4.</p>
        <app-pagination [(page)]="few" [totalPages]="4" ariaLabel="Paginación de pocas páginas" />
      </section>

      <section aria-labelledby="pag-one" class="space-y-3">
        <h2 id="pag-one" class="text-xl">Una sola página</h2>
        <p class="text-fg-muted">Con una página (o ninguna) el componente no se muestra.</p>
        <app-pagination [page]="1" [totalPages]="1" ariaLabel="Paginación de una página" />
      </section>
    </div>
  `,
})
export class PaginationDemo {
  protected readonly many = signal(8);
  protected readonly few = signal(1);
}
