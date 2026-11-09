import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/cart';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { CartLine } from '../../components/cart-line/cart-line';
import { CartTotals } from '../../components/cart-totals/cart-totals';

/**
 * `/carrito`: líneas del carrito con cantidad editable, Quitar, Vaciar y Continuar hacia
 * `/checkout`. Al abrirse vuelve a pedir el carrito al backend. Las líneas no aptas se marcan y
 * bloquean el avance hasta quitarlas.
 */
@Component({
  imports: [PageHeader, ResourceState, CartLine, CartTotals, Alert, Button, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Carrito"
        description="Revisa las presentaciones y cantidades antes de confirmar el pedido."
      >
        <a actions app-button variant="secondary" routerLink="/catalogo">Seguir comprando</a>
      </app-page-header>

      @if (actionError(); as message) {
        <app-alert variant="danger">{{ message }}</app-alert>
      }

      <app-resource-state
        skeleton="table"
        emptyTitle="Tu carrito está vacío"
        emptyDescription="Agrega presentaciones desde el catálogo para armar tu pedido."
        emptyIcon="cart"
        [loading]="loading()"
        [error]="loadError()"
        [empty]="cart.status() === 'ready' && cart.count() === 0"
        (retry)="cart.load()"
      >
        <a emptyActions app-button routerLink="/catalogo">Ver el catálogo</a>

        <div class="space-y-4">
          @if (cart.status() === 'error') {
            <app-alert variant="danger">{{ cart.error()?.message }} Mostrando el último carrito conocido.</app-alert>
          }
          @if (cart.hasInvalidLines()) {
            <app-alert variant="info">
              Hay líneas que ya no se pueden comprar. Quítalas para continuar.
            </app-alert>
          }

          <ul class="space-y-3" aria-label="Líneas del carrito">
            @for (item of cart.items(); track item.variantId) {
              <li>
                <app-cart-line
                  [item]="item"
                  [busy]="busy()"
                  (quantityChange)="setQuantity(item.variantId, $event)"
                  (remove)="remove(item.variantId)"
                />
              </li>
            }
          </ul>

          <app-cart-totals
            [total]="cart.total()"
            [lines]="cart.count()"
            [blocked]="cart.hasInvalidLines()"
            [busy]="busy()"
            (clear)="clear()"
            (proceed)="proceed()"
          />
        </div>
      </app-resource-state>
    </div>
  `,
})
export class Carrito {
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly loading = computed(
    () => this.cart.status() === 'idle' || (this.cart.status() === 'loading' && this.cart.count() === 0),
  );
  /** Con un error y sin líneas conocidas se muestra el error de pantalla completa. */
  protected readonly loadError = computed(() =>
    this.cart.status() === 'error' && this.cart.count() === 0 ? this.cart.error() : null,
  );

  constructor() {
    // El carrito puede haber cambiado en otra pestaña: se vuelve a pedir al abrir la pantalla.
    void this.cart.load();
  }

  protected setQuantity(variantId: string, cantidad: number): Promise<void> {
    return this.run(() => this.cart.setQuantity(variantId, cantidad));
  }

  protected remove(variantId: string): Promise<void> {
    return this.run(() => this.cart.remove(variantId));
  }

  protected clear(): Promise<void> {
    return this.run(() => this.cart.clear());
  }

  protected proceed(): void {
    if (this.cart.count() > 0 && !this.cart.hasInvalidLines()) {
      void this.router.navigateByUrl('/checkout');
    }
  }

  private async run(action: () => Promise<{ ok: boolean; error?: { message: string } }>): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    const result = await action();
    this.busy.set(false);
    if (!result.ok) {
      this.actionError.set(result.error?.message ?? 'Ocurrió un error inesperado');
    }
  }
}
