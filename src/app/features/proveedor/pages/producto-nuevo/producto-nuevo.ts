import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { ApiError, resourceApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { NoStoreNotice } from '../../components/no-store-notice/no-store-notice';
import { ProductForm } from '../../components/product-form/product-form';
import { ProductView } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';

/**
 * `/proveedor/productos/nuevo`. Crea solo el producto y redirige a `/proveedor/productos/:id`
 * para agregar sus presentaciones. Sin tienda muestra «Aún no tienes una tienda»; con la tienda
 * desactivada avisa que no admite productos nuevos y no muestra el formulario.
 */
@Component({
  imports: [PageHeader, ResourceState, Card, Alert, Button, RouterLink, NoStoreNotice, ProductForm],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Nuevo producto"
        description="Primero creas el producto; después agregas sus presentaciones, precios y stock."
      >
        <a actions app-button variant="secondary" routerLink="/proveedor/productos"
          >Volver a mis productos</a
        >
      </app-page-header>

      @if (noStore()) {
        <app-no-store-notice />
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="isLoading()"
          [error]="error()"
          (retry)="retry()"
        >
          @if (store.hasValue() && !store.value().activa) {
            <app-alert variant="info" title="Tienda desactivada">
              Tu tienda está desactivada y no admite productos nuevos.
            </app-alert>
          } @else if (categories.hasValue()) {
            <app-card padding="lg">
              <app-product-form [categories]="categories.value()" (saved)="onSaved($event)" />
            </app-card>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class ProductoNuevo {
  private readonly api = inject(ProveedorApi);
  private readonly catalog = inject(CatalogApi);
  private readonly router = inject(Router);

  protected readonly store = rxResource({ stream: () => this.api.getMyStore() });
  protected readonly categories = rxResource({ stream: () => this.catalog.listCategories() });

  private readonly storeError = computed(() => resourceApiError(this.store.error()));

  protected readonly noStore = computed(() => this.storeError()?.status === 404);
  protected readonly error = computed<ApiError | null>(
    () => this.storeError() ?? resourceApiError(this.categories.error()),
  );
  protected readonly isLoading = computed(
    () => this.store.isLoading() || this.categories.isLoading(),
  );

  protected onSaved(product: ProductView): void {
    void this.router.navigate(['/proveedor/productos', product.id]);
  }

  protected retry(): void {
    if (this.store.error()) {
      this.store.reload();
    }
    if (this.categories.error()) {
      this.categories.reload();
    }
  }
}
