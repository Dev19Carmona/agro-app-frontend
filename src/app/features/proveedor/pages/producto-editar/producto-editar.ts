import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi } from '../../../../core/catalog';
import { ApiError, resourceApiError } from '../../../../core/http';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { NoStoreNotice } from '../../components/no-store-notice/no-store-notice';
import { ProductForm } from '../../components/product-form/product-form';
import { VariantCreateForm } from '../../components/variant-create-form/variant-create-form';
import { VariantEditor } from '../../components/variant-editor/variant-editor';
import { MyProduct, MyVariant, ProductView } from '../../models/proveedor.types';
import { ProveedorApi } from '../../services/proveedor-api';

/**
 * `/proveedor/productos/:id`: edición del producto (incluye `activo`), de cada presentación
 * (datos y stock en formularios independientes) y alta de presentaciones nuevas.
 *
 * El producto sale de `GET /catalog/my-store/products` (no hay un endpoint por id). Cada guardado
 * actualiza solo la parte afectada con la respuesta del backend, sin recargar. Un id ajeno,
 * inexistente o con formato inválido muestra «Producto no encontrado»; sin tienda, «Aún no tienes
 * una tienda».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Button,
    EmptyState,
    RouterLink,
    NoStoreNotice,
    ProductForm,
    VariantEditor,
    VariantCreateForm,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Editar producto" [description]="product() ? product()!.nombre : null">
        <a actions app-button variant="secondary" routerLink="/proveedor/productos"
          >Volver a mis productos</a
        >
      </app-page-header>

      @if (noStore()) {
        <app-no-store-notice />
      } @else if (notFound()) {
        <app-empty-state
          title="Producto no encontrado"
          description="El producto no existe o no es de tu tienda."
          icon="package"
        >
          <a actions app-button routerLink="/proveedor/productos">Ver mis productos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="isLoading()"
          [error]="error()"
          (retry)="retry()"
        >
          @if (product(); as current) {
            @if (categories.hasValue()) {
              <section aria-labelledby="datos-titulo" class="space-y-4">
                <h2 id="datos-titulo" class="text-2xl">Datos del producto</h2>
                <app-card padding="lg">
                  <app-product-form
                    [categories]="categories.value()"
                    [product]="current"
                    (saved)="onProductSaved($event)"
                  />
                </app-card>
              </section>
            }

            <section aria-labelledby="presentaciones-titulo" class="space-y-4">
              <h2 id="presentaciones-titulo" class="text-2xl">Presentaciones</h2>
              @if (current.variantes.length === 0) {
                <p class="text-fg-muted">
                  Este producto aún no tiene presentaciones. Agrega la primera para poder venderlo.
                </p>
              }
              @for (variant of current.variantes; track variant.id) {
                <app-variant-editor [variant]="variant" (changed)="onVariantChanged($event)" />
              }
            </section>

            <section aria-labelledby="nueva-titulo" class="space-y-4">
              <h2 id="nueva-titulo" class="text-2xl">Nueva presentación</h2>
              <app-card padding="lg">
                <app-variant-create-form
                  [productId]="current.id"
                  (created)="onVariantCreated($event)"
                />
              </app-card>
            </section>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class ProductoEditar {
  private readonly api = inject(ProveedorApi);
  private readonly catalog = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');

  protected readonly store = rxResource({ stream: () => this.api.getMyStore() });
  protected readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.getMyProduct(params),
  });
  protected readonly categories = rxResource({ stream: () => this.catalog.listCategories() });

  /** Copia local del producto: se actualiza con cada respuesta del backend. */
  protected readonly product = linkedSignal<MyProduct | null>(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );

  private readonly storeError = computed(() => resourceApiError(this.store.error()));
  private readonly productError = computed(() => resourceApiError(this.loaded.error()));

  protected readonly noStore = computed(() => this.storeError()?.status === 404);
  protected readonly notFound = computed(
    () => !this.noStore() && this.productError()?.status === 404,
  );
  protected readonly error = computed<ApiError | null>(
    () => this.storeError() ?? this.productError() ?? resourceApiError(this.categories.error()),
  );
  protected readonly isLoading = computed(
    () => this.store.isLoading() || this.loaded.isLoading() || this.categories.isLoading(),
  );

  protected onProductSaved(view: ProductView): void {
    this.product.update((p) => (p ? { ...p, ...view } : p));
  }

  protected onVariantChanged(variant: MyVariant): void {
    this.product.update((p) =>
      p ? { ...p, variantes: p.variantes.map((v) => (v.id === variant.id ? variant : v)) } : p,
    );
  }

  protected onVariantCreated(variant: MyVariant): void {
    this.product.update((p) => (p ? { ...p, variantes: [...p.variantes, variant] } : p));
  }

  protected retry(): void {
    if (this.store.error()) {
      this.store.reload();
    }
    if (this.loaded.error()) {
      this.loaded.reload();
    }
    if (this.categories.error()) {
      this.categories.reload();
    }
  }
}
