import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicStore } from '../../../../core/catalog';
import { Card } from '../../../../shared/ui/card/card';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Tarjeta de una tienda del directorio: nombre (enlace a su detalle) y municipio. */
@Component({
  selector: 'app-store-card',
  imports: [RouterLink, Card, Icon],
  template: `
    <app-card
      class="relative h-full transition-colors hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-text"
    >
      <div class="flex h-full items-start gap-3">
        <span
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken text-brand-text"
        >
          <app-icon name="store" />
        </span>
        <div class="min-w-0 space-y-1">
          <h2 class="text-lg leading-snug">
            <a
              class="wrap-break-word after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
              [routerLink]="['/catalogo/tiendas', store().id]"
              >{{ store().nombre }}</a
            >
          </h2>
          <p class="wrap-break-word text-fg-muted">{{ store().municipio }}</p>
        </div>
      </div>
    </app-card>
  `,
  host: { class: 'block' },
})
export class StoreCard {
  readonly store = input.required<PublicStore>();
}
