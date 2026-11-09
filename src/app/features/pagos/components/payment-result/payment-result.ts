import { Component, ElementRef, afterNextRender, computed, inject, input } from '@angular/core';
import { Alert } from '../../../../shared/ui/alert/alert';
import { AlertVariant } from '../../../../shared/ui/alert/alert.types';
import { Payment, rejectionMessage } from '../../../../core/payments';

interface ResultView {
  variant: AlertVariant;
  title: string;
  message: string;
}

/**
 * Resultado de un pago: aprobado, rechazado, con error o en proceso. Al aparecer recibe el foco
 * (`tabindex="-1"`) y el aviso se anuncia (`role="alert"` en rechazo y error, `status` en el resto).
 * El contenido proyectado (pasos siguientes, enlaces) va debajo del mensaje.
 */
@Component({
  selector: 'app-payment-result',
  imports: [Alert],
  template: `
    <app-alert [variant]="view().variant" [title]="view().title">
      <p>{{ view().message }}</p>
      @if (payment().referencia) {
        <p class="text-fg-muted">
          Referencia: <span class="font-mono break-all">{{ payment().referencia }}</span>
        </p>
      }
      <ng-content />
    </app-alert>
  `,
  host: { class: 'block outline-none', tabindex: '-1' },
})
export class PaymentResult {
  readonly payment = input.required<Payment>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly view = computed<ResultView>(() => {
    const { status, motivoRechazo } = this.payment();
    const reason = rejectionMessage(motivoRechazo);
    switch (status) {
      case 'APPROVED':
        return {
          variant: 'success',
          title: 'Pago aprobado',
          message: 'Tu pago se aprobó correctamente.',
        };
      case 'DECLINED':
        return {
          variant: 'danger',
          title: 'Pago rechazado',
          message: `${reason ?? 'La pasarela rechazó el pago'}. Puedes intentarlo de nuevo.`,
        };
      case 'ERROR':
        return {
          variant: 'danger',
          title: 'No se pudo completar el pago',
          message: `${reason ?? 'La pasarela no respondió'}. Puedes reintentar.`,
        };
      default:
        return {
          variant: 'info',
          title: 'Pago en proceso',
          message: 'Estamos esperando la confirmación de la pasarela. No pagues de nuevo.',
        };
    }
  });

  constructor() {
    afterNextRender(() => this.el.nativeElement.focus());
  }
}
