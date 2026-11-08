/**
 * Error de la API normalizado. El backend (NestJS) responde con
 * `{ statusCode, message, error }`, donde `message` es un `string` o, en errores de
 * validación, un `string[]`. `message` aquí ya viene aplanado a un único texto.
 * `status` es `0` cuando no hubo respuesta (red caída o backend apagado).
 */
export interface ApiError {
  status: number;
  message: string;
}
