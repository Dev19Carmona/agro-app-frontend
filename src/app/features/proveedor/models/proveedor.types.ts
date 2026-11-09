import { Product } from '../../../core/catalog';

export interface CreateStoreRequest {
  nombre: string;
  nit: string;
  municipio: string;
}

export interface MyVariant {
  id: string;
  productId: string;
  presentacion: string;
  unidad: string;
  precio: number; // entero en COP
  precioOferta?: number; // menor que `precio`
  precioVigente: number;
  stock: number;
  stockReservado: number;
  disponible: number; // stock - stockReservado
  activo: boolean;
}
/** `Product` viene de `core/catalog`; el proveedor ve también los inactivos. */
export interface MyProduct extends Product {
  variantes: MyVariant[];
}
/** Producto tal como lo devuelven crear y editar: sin presentaciones. */
export type ProductView = Product;

export interface CreateProductRequest {
  categoryId: string;
  nombre: string;
  marca: string;
  fichaTecnica: Record<string, string>;
  requiresQuote?: boolean;
}
export type UpdateProductRequest = Partial<CreateProductRequest> & { activo?: boolean };

export interface CreateVariantRequest {
  presentacion: string;
  unidad: string;
  precio: number;
  precioOferta?: number;
  stock: number;
}
export interface UpdateVariantRequest {
  presentacion?: string;
  unidad?: string;
  precio?: number;
  precioOferta?: number | null; // null quita la oferta
  activo?: boolean;
}

export interface ProviderOrderItem {
  id: string;
  variantId: string;
  productId: string;
  nombreProducto: string;
  presentacion: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}
export interface ProviderSubOrder {
  id: string;
  orderId: string;
  status: 'CONFIRMED';
  subtotal: number;
  createdAt: string; // ISO
  items: ProviderOrderItem[];
}

/** Fila del editor de ficha técnica (el backend usa un `Record`). */
export interface FichaRow {
  clave: string;
  valor: string;
}

export const PROVEEDOR_PAGE_SIZE = 10;
/** Máximo de entradas de la ficha técnica; clave de hasta 50 caracteres y valor de hasta 500. */
export const FICHA_MAX_ENTRADAS = 30;
