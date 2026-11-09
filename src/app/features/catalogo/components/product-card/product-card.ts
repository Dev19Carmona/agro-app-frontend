import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../core/catalog';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Card } from '../../../../shared/ui/card/card';
import { Icon } from '../../../../shared/ui/icon/icon';

/**
 * Tarjeta de un producto del listado: nombre (enlace al detalle), marca, categoría, tienda y el
 * aviso "A cotizar". No muestra precio: el listado del backend no lo trae.
 *
 * Toda la tarjeta es clicable con un solo enlace (el del nombre), así el foco y el lector de
 * pantalla ven un único destino. Valores por defecto: `categoryName=null`, `storeName=null`.
 */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, Card, Badge, Icon],
  template: `
    <app-card
      class="relative h-full transition-colors hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-text"
    >
      <div class="flex h-full flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <span
            class="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken text-brand-text"
          >
            <app-icon name="leaf" />
          </span>
          @if (product().requiresQuote) {
            <app-badge tone="warning">A cotizar</app-badge>
          }
        </div>
        <div class="min-w-0 space-y-1">
          <h2 class="text-lg leading-snug">
            <a
              class="wrap-break-word after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
              [routerLink]="['/catalogo/productos', product().id]"
              >{{ product().nombre }}</a
            >
          </h2>
          <p class="wrap-break-word text-fg-muted">{{ product().marca }}</p>
        </div>
        <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
          @if (categoryName()) {
            <app-badge>{{ categoryName() }}</app-badge>
          }
          @if (storeName()) {
            <span class="inline-flex min-w-0 items-center gap-1.5">
              <app-icon name="store" size="sm" />
              <span class="wrap-break-word">{{ storeName() }}</span>
            </span>
          }
        </div>
      </div>
    </app-card>
  `,
  host: { class: 'block' },
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly categoryName = input<string | null>(null);
  readonly storeName = input<string | null>(null);
}
