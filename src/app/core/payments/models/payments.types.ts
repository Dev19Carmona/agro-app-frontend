export type PaymentMethod = 'CARD' | 'PSE' | 'NEQUI';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export interface Payment {
  id: string;
  orderId: string;
  /** Entero en COP. */
  monto: number;
  /** `'COP'`. */
  moneda: string;
  metodo: PaymentMethod;
  status: PaymentStatus;
  referencia?: string;
  /** Código técnico del backend (`INSUFFICIENT_FUNDS`, `GATEWAY_ERROR`, `INVALID_TOKEN`…). */
  motivoRechazo?: string;
  /** ISO. */
  createdAt: string;
}
