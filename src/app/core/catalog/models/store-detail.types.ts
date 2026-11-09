/** Tienda completa, activa o no (espejo de `StoreView` del backend). */
export interface StoreDetail {
  id: string;
  nombre: string;
  nit: string;
  ownerId: string;
  municipio: string;
  activa: boolean;
  createdAt: string; // ISO
}
