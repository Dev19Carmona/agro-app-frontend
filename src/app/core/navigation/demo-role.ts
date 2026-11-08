import { DOCUMENT, Service, inject, signal } from '@angular/core';
import { DEMO_ROLE_OPTIONS } from './nav.config';
import { DEMO_ROLE_STORAGE_KEY, DemoRole } from './navigation.types';

function isDemoRole(value: unknown): value is DemoRole {
  return DEMO_ROLE_OPTIONS.some((option) => option.id === value);
}

/**
 * Rol simulado de la demo. Solo filtra el panel de navegación: no autentica ni autoriza nada.
 * Se guarda en `localStorage` (`agro:demo-role`); por defecto es `VISITANTE`.
 */
@Service()
export class DemoRoleService {
  private readonly win = inject(DOCUMENT).defaultView;

  private readonly _role = signal<DemoRole>(this.readStored() ?? 'VISITANTE');

  /** Rol de demo actual. */
  readonly role = this._role.asReadonly();

  /** Cambia el rol y lo guarda. Un valor no válido se ignora. */
  setRole(role: DemoRole): void {
    if (!isDemoRole(role)) {
      return;
    }
    this._role.set(role);
    try {
      this.win?.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
    } catch {
      // Sin almacenamiento (modo privado, datos bloqueados): el rol dura la sesión.
    }
  }

  private readStored(): DemoRole | null {
    try {
      const value = this.win?.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
      return isDemoRole(value) ? value : null;
    } catch {
      return null;
    }
  }
}
