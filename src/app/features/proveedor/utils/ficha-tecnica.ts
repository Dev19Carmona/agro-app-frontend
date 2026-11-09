import { FICHA_MAX_ENTRADAS, FichaRow } from '../models/proveedor.types';
import { LIMITS } from './product-validation';

/** Problema de la ficha: `row` es el índice de la fila, o `null` si es del conjunto. */
export interface FichaIssue {
  row: number | null;
  message: string;
}

/** Filas del editor a partir del `Record` del backend. */
export function fichaToRows(ficha: Record<string, string>): FichaRow[] {
  return Object.entries(ficha).map(([clave, valor]) => ({ clave, valor }));
}

/** `Record` para el backend. Ignora las filas totalmente vacías y recorta la clave. */
export function rowsToFicha(rows: readonly FichaRow[]): Record<string, string> {
  const ficha: Record<string, string> = {};
  for (const row of rows) {
    const clave = row.clave.trim();
    if (clave === '' && row.valor.trim() === '') {
      continue;
    }
    ficha[clave] = row.valor;
  }
  return ficha;
}

/**
 * Valida la ficha: hasta 30 entradas, claves obligatorias de hasta 50 caracteres y únicas sin
 * distinguir mayúsculas, y valores de hasta 500. Las filas totalmente vacías no cuentan.
 */
export function validateFicha(rows: readonly FichaRow[]): FichaIssue[] {
  const issues: FichaIssue[] = [];
  const seen = new Set<string>();
  let entries = 0;

  rows.forEach((row, index) => {
    const clave = row.clave.trim();
    if (clave === '' && row.valor.trim() === '') {
      return;
    }
    entries += 1;
    if (clave === '') {
      issues.push({ row: index, message: 'La clave no puede estar vacía' });
    } else if (clave.length > LIMITS.fichaClave) {
      issues.push({ row: index, message: `La clave admite hasta ${LIMITS.fichaClave} caracteres` });
    } else {
      const key = clave.toLowerCase();
      if (seen.has(key)) {
        issues.push({ row: index, message: `La clave «${clave}» está repetida` });
      }
      seen.add(key);
    }
    if (row.valor.length > LIMITS.fichaValor) {
      issues.push({ row: index, message: `El valor admite hasta ${LIMITS.fichaValor} caracteres` });
    }
  });

  if (entries > FICHA_MAX_ENTRADAS) {
    issues.push({ row: null, message: `La ficha admite hasta ${FICHA_MAX_ENTRADAS} entradas` });
  }
  return issues;
}
