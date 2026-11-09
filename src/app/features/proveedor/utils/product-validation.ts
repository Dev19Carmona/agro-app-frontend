/** Límites de texto del backend. Se validan en el cliente solo como ayuda de UX. */
export const LIMITS = {
  tiendaNombre: 120,
  tiendaNit: 30,
  tiendaMunicipio: 100,
  productoNombre: 200,
  productoMarca: 100,
  presentacion: 100,
  unidad: 20,
  fichaClave: 50,
  fichaValor: 500,
} as const;

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function isObjectId(value: string): boolean {
  return OBJECT_ID.test(value);
}

/** Texto obligatorio de 1 a `max` caracteres (sin contar espacios de los extremos). */
export function validateRequiredText(value: string, etiqueta: string, max: number): string | null {
  const text = value.trim();
  if (text.length === 0) {
    return `Escribe ${etiqueta}`;
  }
  if (text.length > max) {
    return `Máximo ${max} caracteres`;
  }
  return null;
}

/** Precio: entero positivo en COP. */
export function validatePrice(precio: number | null): string | null {
  if (precio === null) {
    return 'Escribe el precio';
  }
  if (!Number.isInteger(precio) || precio < 1) {
    return 'El precio debe ser un entero mayor que 0';
  }
  return null;
}

/** Precio de oferta: opcional (`null` = sin oferta), entero positivo y menor que el precio. */
export function validateOffer(oferta: number | null, precio: number | null): string | null {
  if (oferta === null) {
    return null;
  }
  if (!Number.isInteger(oferta) || oferta < 1) {
    return 'La oferta debe ser un entero mayor que 0';
  }
  if (precio !== null && oferta >= precio) {
    return 'La oferta debe ser menor que el precio';
  }
  return null;
}

/** Stock absoluto: entero mayor o igual a 0 y a lo ya reservado. */
export function validateStock(stock: number | null, reservado = 0): string | null {
  if (stock === null) {
    return 'Escribe el stock';
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return 'El stock debe ser un entero mayor o igual a 0';
  }
  if (stock < reservado) {
    return `No puede ser menor que lo reservado (${reservado})`;
  }
  return null;
}
