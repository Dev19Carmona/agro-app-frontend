import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { PaginationItem } from './pagination.types';

/**
 * Páginas que se muestran a cada lado de la actual. Con 1 la barra tiene como máximo 7 elementos:
 * `1 … 4 5 6 … 9`.
 */
const SIBLINGS = 1;

/**
 * Números de página visibles para `current` de `total`. Siempre incluye la primera, la última y
 * la actual con sus vecinas; los saltos de más de una página se sustituyen por `…` (un salto de
 * exactamente una página muestra ese número, que ocupa lo mismo que los puntos).
 */
export function buildPaginationItems(current: number, total: number): PaginationItem[] {
  if (total < 1) {
    return [];
  }
  const wanted = new Set<number>([1, total]);
  for (let p = current - SIBLINGS; p <= current + SIBLINGS; p++) {
    if (p >= 1 && p <= total) {
      wanted.add(p);
    }
  }
  const pages = [...wanted].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous === 2) {
      items.push({ kind: 'page', page: previous + 1 });
    } else if (previous !== undefined && page - previous > 2) {
      items.push({ kind: 'gap', key: `gap-${previous}` });
    }
    items.push({ kind: 'page', page });
  });
  return items;
}

/**
 * Paginación numerada con botones anterior y siguiente. Se oculta si `totalPages <= 1`. Se enlaza
 * con `[(page)]` (empieza en 1). La página actual lleva `aria-current="page"`; anterior y siguiente
 * se deshabilitan en los extremos.
 *
 * ```html
 * <app-pagination [(page)]="page" [totalPages]="totalPages" ariaLabel="Paginación de productos" />
 * ```
 *
 * Valores por defecto: `page=1`, `totalPages=0`, `ariaLabel='Paginación'`.
 */
@Component({
  selector: 'app-pagination',
  imports: [Button, Icon],
  template: `
    @if (visible()) {
      <nav [attr.aria-label]="ariaLabel()">
        <ul class="flex flex-wrap items-center justify-center gap-1">
          <li>
            <button
              app-button
              variant="ghost"
              iconOnly
              ariaLabel="Página anterior"
              [disabled]="current() <= 1"
              (click)="goTo(current() - 1)"
            >
              <app-icon name="chevron-right" class="rotate-180" />
            </button>
          </li>
          @for (item of items(); track item.kind === 'page' ? item.page : item.key) {
            <li>
              @if (item.kind === 'page') {
                <button
                  app-button
                  iconOnly
                  [variant]="item.page === current() ? 'primary' : 'ghost'"
                  [ariaLabel]="'Página ' + item.page"
                  [attr.aria-current]="item.page === current() ? 'page' : null"
                  (click)="goTo(item.page)"
                >
                  {{ item.page }}
                </button>
              } @else {
                <span
                  class="inline-flex size-10 items-center justify-center text-fg-muted"
                  aria-hidden="true"
                  >…</span
                >
              }
            </li>
          }
          <li>
            <button
              app-button
              variant="ghost"
              iconOnly
              ariaLabel="Página siguiente"
              [disabled]="current() >= totalPages()"
              (click)="goTo(current() + 1)"
            >
              <app-icon name="chevron-right" />
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
  host: { class: 'block' },
})
export class Pagination {
  readonly page = model(1);
  readonly totalPages = input(0);
  readonly ariaLabel = input('Paginación');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly visible = computed(() => this.totalPages() > 1);
  /** Página actual acotada a `1..totalPages`, aunque el consumidor pase un valor fuera de rango. */
  protected readonly current = computed(() =>
    Math.min(Math.max(1, Math.trunc(this.page())), Math.max(1, this.totalPages())),
  );
  protected readonly items = computed(() =>
    buildPaginationItems(this.current(), this.totalPages()),
  );

  protected goTo(target: number): void {
    const next = Math.min(Math.max(1, target), this.totalPages());
    if (next === this.current()) {
      return;
    }
    this.page.set(next);
    // Si el botón pulsado se deshabilita (llegó a un extremo) el foco se perdería: pasa a la actual.
    afterNextRender(
      () => {
        const doc = this.host.ownerDocument;
        const active = doc.activeElement as HTMLButtonElement | null;
        if (!active || active === doc.body || active.disabled) {
          this.host.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
