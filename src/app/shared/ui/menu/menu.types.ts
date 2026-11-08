import type { ButtonSize, ButtonVariant } from '../button/button.types';
import type { IconName } from '../icon/icon.types';

export interface MenuItem {
  /** Identificador estable: es lo que emite `itemSelect` y lo que compara `selectedId`. */
  id: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  /** Dibuja un separador encima de este ítem. */
  dividerBefore?: boolean;
}

/** `start`: el menú se alinea al inicio del botón; `end`: a su final (útil en el borde derecho). */
export type MenuAlign = 'start' | 'end';

export type MenuTriggerVariant = ButtonVariant;
export type MenuTriggerSize = ButtonSize;
