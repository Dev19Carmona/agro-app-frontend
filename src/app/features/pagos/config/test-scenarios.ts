export interface TestScenario {
  id: string;
  label: string;
  token: string;
  hint: string;
}

/** Escenarios del simulador de pasarela. `Otro token` no es un escenario: abre el campo libre. */
export const TEST_SCENARIOS: readonly TestScenario[] = [
  {
    id: 'approved',
    label: 'Aprobado',
    token: 'tok_test_approved',
    hint: 'El pago se aprueba y el pedido se confirma.',
  },
  {
    id: 'declined',
    label: 'Rechazado',
    token: 'tok_test_declined',
    hint: 'La pasarela rechaza el pago por fondos insuficientes.',
  },
  {
    id: 'error',
    label: 'Error de pasarela',
    token: 'tok_test_error',
    hint: 'La pasarela falla; se puede reintentar.',
  },
  {
    id: 'pending',
    label: 'Pendiente',
    token: 'tok_test_pending',
    hint: 'El pago queda en proceso hasta que la pasarela lo resuelva.',
  },
];

export const DEFAULT_SCENARIO_ID = 'approved';
/** Valor del selector que abre el campo de texto libre. */
export const CUSTOM_TOKEN_ID = 'custom';
