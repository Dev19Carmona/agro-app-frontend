/** Forma del esqueleto de carga: `grid` (tarjetas), `detail` (ficha y tabla) o `table`. */
export type ResourceSkeleton = 'grid' | 'detail' | 'table';

/** Error que muestra `app-resource-state`. Es compatible con el `ApiError` de la app. */
export interface ResourceStateError {
  message: string;
}
