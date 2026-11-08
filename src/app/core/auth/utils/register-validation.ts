/**
 * Validación del registro que replica la política del backend (`checkPasswordPolicy` y el DTO de
 * registro). Es solo ayuda de UX: el backend sigue siendo la autoridad.
 */

export const PASSWORD_MIN_LENGTH = 10;
/** Límite real de bcrypt en el backend: más allá se trunca. */
export const PASSWORD_MAX_BYTES = 72;
export const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{5,20}$/;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 120;

/** Incumplimientos de la política de contraseña, en el mismo orden que el backend. */
export function passwordProblems(password: string, email: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    problems.push(`La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes`);
  }
  if (!/\p{Lu}/u.test(password)) {
    problems.push('La contraseña debe incluir una mayúscula');
  }
  if (!/\p{Ll}/u.test(password)) {
    problems.push('La contraseña debe incluir una minúscula');
  }
  if (!/\d/.test(password)) {
    problems.push('La contraseña debe incluir un número');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail && password.toLowerCase().includes(normalizedEmail)) {
    problems.push('La contraseña no puede contener el email');
  }
  return problems;
}

/** `true` si el nombre recortado tiene entre 2 y 120 caracteres. */
export function isValidName(name: string): boolean {
  const length = name.trim().length;
  return length >= NAME_MIN_LENGTH && length <= NAME_MAX_LENGTH;
}

export function isValidDocument(documento: string): boolean {
  return DOCUMENT_PATTERN.test(documento.trim());
}
