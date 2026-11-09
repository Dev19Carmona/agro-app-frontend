import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../../../core/cart';
import { CatalogApi, formatCop } from '../../../../core/catalog';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderItemsByStore } from '../../components/order-items-by-store/order-items-by-store';
import { PedidosApi } from '../../services/pedidos-api';
import { CheckoutApiError } from '../../models/pedidos.types';
import { loadStoreNames } from '../../utils/store-names';

/**
 * `/checkout`: resumen del carrito por tienda (con el nombre de cada una) y **Confirmar pedido**.
 *
 * - La `Idempotency-Key` (`crypto.randomUUID()`) se genera al primer clic y se reutiliza mientras el
 *   carrito no cambie, salvo tras un error definitivo del cliente (`4xx`): un fallo de red o un `5xx`
 *   reintenta con la misma clave para no crear un segundo pedido. Vive solo en memoria.
 * - Con éxito el carrito local se vacía y se navega a `/pedidos/:id`.
 * - Un `400` con `lineas` marca las líneas inválidas y permite quitarlas sin perder el resto.
 * - Con el carrito vacío redirige a `/carrito`.
 */
@Component({
  imports: [PageHeader, ResourceState, OrderItemsByStore, Alert, Button, Card, RouterLink],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Confirmar pedido"
        description="Revisa tu pedido por tienda. El precio final se toma del catálogo al confirmar."
      >
        <a actions app-button variant="secondary" routerLink="/carrito">Volver al carrito</a>
      </app-page-header>

      <app-resource-state
        skeleton="table"
        [loading]="loading()"
        [error]="loadError()"
        (retry)="cart.load()"
      >
        <div class="space-y-4">
          @if (submitError(); as message) {
            <app-alert variant="danger">{{ message }}</app-alert>
          }
          @if (hasInvalid()) {
            <app-alert variant="info">
              <span class="flex flex-wrap items-center gap-3">
                <span>Algunas líneas ya no se pueden comprar. Quítalas para confirmar.</span>
                <button
                  app-button
                  size="sm"
                  variant="secondary"
                  [disabled]="submitting()"
                  (click)="removeInvalid()"
                >
                  Quitar líneas no válidas
                </button>
              </span>
            </app-alert>
          }

          <app-order-items-by-store
            [items]="cart.items()"
            [storeNames]="storeNames()"
            [invalidIds]="invalidIds()"
            [busy]="submitting()"
            (removeLine)="removeLine($event)"
          />

          <app-card class="space-y-4">
            <p class="flex items-baseline justify-between gap-4">
              <span class="text-fg-muted">Total estimado</span>
              <span class="text-2xl font-semibold">{{ cop(cart.total()) }}</span>
            </p>
            <div class="flex justify-end">
              <button
                app-button
                size="lg"
                [disabled]="submitting() || hasInvalid() || cart.count() === 0"
                (click)="confirm()"
              >
                {{ submitting() ? 'Confirmando…' : 'Confirmar pedido' }}
              </button>
            </div>
          </app-card>
        </div>
      </app-resource-state>
    </div>
  `,
})
export class Checkout {
  protected readonly cart = inject(CartService);
  private readonly catalog = inject(CatalogApi);
  private readonly api = inject(PedidosApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  /** Variantes que el backend rechazó en el último intento. */
  private readonly rejectedIds = signal<ReadonlySet<string>>(new Set());
  /** Tras un checkout correcto: evita que el carrito vacío redirija a `/carrito`. */
  private done = false;

  /** Clave del intento en curso y el carrito (variante:cantidad) para el que se generó. */
  private key: string | null = null;
  private keySignature = '';

  protected readonly cop = formatCop;

  protected readonly loading = computed(
    () =>
      this.cart.status() === 'idle' ||
      (this.cart.status() === 'loading' && this.cart.count() === 0) ||
      (this.cart.status() === 'ready' && this.cart.count() === 0),
  );
  protected readonly loadError = computed(() =>
    this.cart.status() === 'error' && this.cart.count() === 0 ? this.cart.error() : null,
  );

  protected readonly invalidIds = computed(() => {
    const ids = new Set(this.rejectedIds());
    for (const item of this.cart.items()) {
      if (!item.apta) {
        ids.add(item.variantId);
      }
    }
    return ids as ReadonlySet<string>;
  });
  protected readonly hasInvalid = computed(() =>
    this.cart.items().some((item) => this.invalidIds().has(item.variantId)),
  );

  private readonly storeIds = computed(() =>
    [...new Set(this.cart.items().flatMap((item) => (item.storeId ? [item.storeId] : [])))]
      .sort()
      .join(','),
  );
  /** Nombre de cada tienda; si una consulta falla se usa el nombre por defecto. */
  private readonly stores = rxResource({
    params: () => this.storeIds() || undefined,
    stream: ({ params }) => loadStoreNames(this.catalog, params.split(',')),
  });
  protected readonly storeNames = computed<ReadonlyMap<string, string>>(() =>
    this.stores.hasValue() ? this.stores.value() : new Map(),
  );

  constructor() {
    // El carrito puede haber cambiado en otra pestaña: se vuelve a pedir al abrir la pantalla.
    void this.cart.load();
    // Un carrito vacío no tiene qué confirmar: de vuelta al carrito, que muestra el estado vacío.
    effect(() => {
      if (this.cart.status() === 'ready' && this.cart.count() === 0 && !this.done) {
        untracked(() => void this.router.navigateByUrl('/carrito', { replaceUrl: true }));
      }
    });
  }

  protected async confirm(): Promise<void> {
    if (this.submitting() || this.hasInvalid() || this.cart.count() === 0) {
      return;
    }
    const signature = this.cart
      .items()
      .map((item) => `${item.variantId}:${item.cantidad}`)
      .join('|');
    if (this.key === null || this.keySignature !== signature) {
      this.key = crypto.randomUUID();
      this.keySignature = signature;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    try {
      const order = await firstValueFrom(this.api.checkout(this.key));
      this.done = true;
      this.key = null;
      this.cart.reset();
      void this.cart.load();
      await this.router.navigate(['/pedidos', order.id]);
    } catch (error) {
      const failure = error as CheckoutApiError;
      this.submitError.set(failure.message);
      // Un `4xx` definitivo no creó el pedido: el próximo intento usa una clave nueva.
      if (failure.status >= 400 && failure.status < 500) {
        this.key = null;
      }
      if (failure.lineas?.length) {
        this.rejectedIds.set(new Set(failure.lineas.map((line) => line.variantId)));
        void this.cart.load();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async removeLine(variantId: string): Promise<void> {
    this.submitting.set(true);
    const result = await this.cart.remove(variantId);
    this.submitting.set(false);
    if (result.ok) {
      this.rejectedIds.update((ids) => new Set([...ids].filter((id) => id !== variantId)));
    } else {
      this.submitError.set(result.error.message);
    }
  }

  protected async removeInvalid(): Promise<void> {
    this.submitting.set(true);
    this.submitError.set(null);
    for (const variantId of [...this.invalidIds()]) {
      const result = await this.cart.remove(variantId);
      if (!result.ok) {
        this.submitError.set(result.error.message);
        break;
      }
    }
    this.rejectedIds.set(new Set());
    this.submitting.set(false);
  }
}
