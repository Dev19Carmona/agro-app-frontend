import type { ValidationError } from '@angular/forms/signals';

/**
 * Errores de un campo tal como los entrega Signal Forms al control (`[formField]`). Cada error
 * puede traer un `message` legible; los que no lo traen no se muestran.
 */
export type FieldErrors = readonly ValidationError.WithOptionalFieldTree[];

/** Primer mensaje legible de la lista, o `null` si no hay ninguno. */
export function firstErrorMessage(errors: FieldErrors): string | null {
  return errors.find((error) => !!error.message)?.message ?? null;
}

let nextId = 0;

/** Id único para enlazar ayuda y error con su control (`aria-describedby`). */
export function uniqueId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}
