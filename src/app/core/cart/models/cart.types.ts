/** Línea del carrito tal como la devuelve `GET /orders/cart` (precio y disponibilidad del catálogo). */
export interface CartItem {
  variantId: string;
  cantidad: number;
  disponible: number;
  apta: boolean;
  // Ausentes si la variante ya no existe.
  productId?: string;
  storeId?: string;
  nombreProducto?: string;
  presentacion?: string;
  unidad?: string;
  /** Entero en COP. */
  precioVigente?: number;
}

/** `total` es informativo y solo suma las líneas aptas. */
export interface Cart {
  items: CartItem[];
  total: number;
}

export type CartStatus = 'idle' | 'loading' | 'ready' | 'error';

export const MAX_CART_QUANTITY = 1000;
export const MAX_CART_LINES = 50;
