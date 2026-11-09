import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { CatalogApi } from '../../../core/catalog';

/**
 * Nombre de cada tienda (`GET /catalog/stores/:id`) en un mapa `storeId → nombre`. Una consulta que
 * falla no rompe las demás: esa tienda simplemente no aparece en el mapa y la pantalla usa "Tienda".
 */
export function loadStoreNames(
  catalog: CatalogApi,
  storeIds: readonly string[],
): Observable<Map<string, string>> {
  if (storeIds.length === 0) {
    return of(new Map());
  }
  return forkJoin(
    storeIds.map((id) =>
      catalog.getStore(id).pipe(
        map((store) => [id, store.nombre] as const),
        catchError(() => of(null)),
      ),
    ),
  ).pipe(
    map((entries) => new Map(entries.filter((e): e is readonly [string, string] => e !== null))),
  );
}
