/** `true` si `value` es un ObjectId de Mongo (24 caracteres hexadecimales), como exige el backend. */
export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}
