const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Da formato de pesos colombianos a un entero: `25000` → `"$ 25.000"`. Sin decimales y sin
 * redondear: los precios del backend ya son enteros en COP.
 */
export function formatCop(value: number): string {
  // `Intl` separa el símbolo con un espacio duro (U+00A0); se normaliza a un espacio normal.
  return COP.format(value).replace(/\s/g, ' ');
}
