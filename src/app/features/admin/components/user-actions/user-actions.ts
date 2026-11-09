import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { ApiError } from '../../../../core/http';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { SelectOption } from '../../../../shared/ui/select/select.types';
import { AdminUser, REJECT_REASON_MAX_LENGTH, UserRole } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { userActions } from '../../utils/user-actions';
import { USER_ROLES, isUserRole, userRoleLabel } from '../../utils/user-labels';

interface Message {
  variant: 'success' | 'danger';
  text: string;
}

/**
 * Acciones de administración sobre un usuario: aprobar, rechazar, deshabilitar, habilitar y cambiar
 * rol, según `userActions`. Aprobar y habilitar se ejecutan sin confirmación; rechazar (con motivo
 * opcional), deshabilitar y cambiar rol piden confirmación en un `app-dialog`. Mientras una acción
 * está en curso sus botones quedan deshabilitados y no se envía una segunda. El resultado (o el
 * error del backend) se muestra en un `app-alert` y el usuario actualizado sale por `userChange`.
 */
@Component({
  selector: 'app-user-actions',
  imports: [Alert, Button, Dialog, Input, Select],
  template: `
    <div class="space-y-4">
      @if (message(); as m) {
        <app-alert [variant]="m.variant">{{ m.text }}</app-alert>
      }

      @if (hasAny()) {
        <div class="flex flex-wrap gap-2">
          @if (actions().approve) {
            <button app-button [disabled]="busy()" (click)="approve()">Aprobar</button>
          }
          @if (actions().reject) {
            <button app-button variant="danger" [disabled]="busy()" (click)="rejectOpen.set(true)">
              Rechazar
            </button>
          }
          @if (actions().enable) {
            <button app-button [disabled]="busy()" (click)="enable()">Habilitar</button>
          }
          @if (actions().disable) {
            <button app-button variant="danger" [disabled]="busy()" (click)="disableOpen.set(true)">
              Deshabilitar
            </button>
          }
          @if (actions().changeRole) {
            <button app-button variant="secondary" [disabled]="busy()" (click)="roleOpen.set(true)">
              Cambiar rol
            </button>
          }
        </div>
      } @else if (!actions().selfNote) {
        <p class="text-sm text-fg-muted">No hay acciones disponibles para esta cuenta.</p>
      }

      @if (actions().selfNote) {
        <p class="text-sm text-fg-muted">
          Es tu propia cuenta: no puedes deshabilitarla ni cambiar tu rol.
        </p>
      }
    </div>

    <app-dialog
      [(open)]="rejectOpen"
      title="Rechazar solicitud"
      [description]="
        'Se rechazará la solicitud de ' + user().nombre + '. Puedes indicar un motivo.'
      "
      confirmLabel="Rechazar"
      variant="danger"
      [busy]="busy()"
      (confirmed)="reject()"
    >
      <app-input
        label="Motivo (opcional)"
        [hint]="'Hasta ' + reasonMax + ' caracteres'"
        [errors]="reasonErrors()"
        [touched]="reasonTooLong()"
        [value]="reason()"
        (valueChange)="reason.set(asText($event))"
      />
    </app-dialog>

    <app-dialog
      [(open)]="disableOpen"
      title="Deshabilitar cuenta"
      [description]="
        'La cuenta de ' +
        user().nombre +
        ' no podrá iniciar sesión y se cerrarán todas sus sesiones.'
      "
      confirmLabel="Deshabilitar"
      variant="danger"
      [busy]="busy()"
      (confirmed)="disable()"
    />

    <app-dialog
      [(open)]="roleOpen"
      title="Cambiar rol"
      [description]="
        'Se cambiará el rol de ' + user().nombre + ' y se cerrarán todas sus sesiones.'
      "
      confirmLabel="Cambiar rol"
      [busy]="busy()"
      (confirmed)="changeRole()"
    >
      <app-select
        label="Nuevo rol"
        [options]="roleOptions()"
        [value]="newRole()"
        (valueChange)="newRole.set($event)"
      />
    </app-dialog>
  `,
  host: { class: 'block' },
})
export class UserActions {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = input.required<AdminUser>();
  /** Id del administrador con sesión; sirve para ocultar acciones sobre sí mismo. */
  readonly currentUserId = input<string | null>(null);

  /** El backend devolvió el usuario actualizado. */
  readonly userChange = output<AdminUser>();

  protected readonly actions = computed(() => userActions(this.user(), this.currentUserId()));
  protected readonly hasAny = computed(() => {
    const a = this.actions();
    return a.approve || a.reject || a.enable || a.disable || a.changeRole;
  });

  protected readonly busy = signal(false);
  protected readonly message = signal<Message | null>(null);

  protected readonly rejectOpen = signal(false);
  protected readonly disableOpen = signal(false);
  protected readonly roleOpen = signal(false);

  protected readonly reasonMax = REJECT_REASON_MAX_LENGTH;
  protected readonly reason = signal('');
  protected readonly reasonTooLong = computed(
    () => this.reason().trim().length > REJECT_REASON_MAX_LENGTH,
  );
  protected readonly reasonErrors = computed(() =>
    this.reasonTooLong()
      ? [{ kind: 'max', message: `Máximo ${REJECT_REASON_MAX_LENGTH} caracteres` }]
      : [],
  );

  /** Los roles distintos del actual. */
  protected readonly roleOptions = computed<SelectOption[]>(() =>
    USER_ROLES.filter((rol) => rol !== this.user().rol).map((rol) => ({
      value: rol,
      label: userRoleLabel(rol),
    })),
  );
  protected readonly newRole = linkedSignal(() => this.roleOptions()[0]?.value ?? '');

  protected approve(): void {
    this.run(() => this.api.approveUser(this.user().id), 'Cuenta aprobada.');
  }

  protected reject(): void {
    if (this.reasonTooLong()) {
      return;
    }
    this.run(
      () => this.api.rejectUser(this.user().id, this.reason()),
      'Solicitud rechazada.',
      this.rejectOpen,
    );
  }

  protected enable(): void {
    this.run(() => this.api.enableUser(this.user().id), 'Cuenta habilitada.');
  }

  protected disable(): void {
    this.run(
      () => this.api.disableUser(this.user().id),
      'Cuenta deshabilitada. Se cerraron todas sus sesiones.',
      this.disableOpen,
    );
  }

  protected changeRole(): void {
    const rol = this.newRole();
    if (!isUserRole(rol)) {
      return;
    }
    this.run(
      () => this.api.changeUserRole(this.user().id, rol as UserRole),
      `Rol cambiado a ${userRoleLabel(rol)}. Se cerraron todas sus sesiones.`,
      this.roleOpen,
    );
  }

  protected asText(value: string | number | null): string {
    return value === null ? '' : String(value);
  }

  /** Ejecuta una acción: un solo envío a la vez; el diálogo se cierra al terminar, bien o mal. */
  private run(
    call: () => Observable<AdminUser>,
    success: string,
    dialog?: { set(open: boolean): void },
  ): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    call()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.userChange.emit(updated);
          this.message.set({ variant: 'success', text: success });
          this.reason.set('');
          dialog?.set(false);
        },
        error: (error: ApiError) => {
          this.message.set({ variant: 'danger', text: error.message });
          dialog?.set(false);
        },
      });
  }
}
