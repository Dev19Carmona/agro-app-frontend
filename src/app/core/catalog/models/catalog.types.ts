/** Página de resultados del backend (misma forma que `GET /auth/users`). */
export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  nombre: string;
  marca: string;
  fichaTecnica: Record<string, string>;
  requiresQuote: boolean;
  activo: boolean;
}

/** Presentación de un producto tal como la ve el público (sin `stock` ni `stockReservado`). */
export interface PublicVariant {
  id: string;
  productId: string;
  presentacion: string;
  unidad: string;
  /** Entero en COP. */
  precio: number;
  /** Entero en COP, menor que `precio`. Solo existe si hay oferta vigente. */
  precioOferta?: number;
  precioVigente: number;
  /** `stock - stockReservado`. 0 se muestra como "Sin stock", no se oculta. */
  disponible: number;
}

export interface ProductDetail extends Product {
  variantes: PublicVariant[];
}

export interface PublicStore {
  id: string;
  nombre: string;
  municipio: string;
}

export interface PublicCategory {
  id: string;
  nombre: string;
}
