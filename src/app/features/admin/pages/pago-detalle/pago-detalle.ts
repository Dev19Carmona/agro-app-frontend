import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatCop } from '../../../../core/catalog';
import { resourceApiError } from '../../../../core/http';
import {
  PaymentStatusBadge,
  paymentMethodLabel,
  rejectionMessage,
} from '../../../../core/payments';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { AttemptsTable } from '../../components/attempts-table/attempts-table';
import { AdminPaymentDetail } from '../../models/admin.types';
import { AdminApi } from '../../services/admin-api';
import { isObjectId } from '../../utils/filter-params';
import { formatDateTime, shortId } from '../../utils/format';
import { paymentsError } from '../../utils/payments-error';

/**
 * `/admin/pagos/:id`: pago en solo lectura (sin ninguna acción) con estado, monto, método,
 * referencia, motivo de rechazo, comprador, enlace al pedido y el historial de intentos. No sondea.
 * Un `429` muestra «Demasiados intentos, espera un minuto». Un id inválido o inexistente muestra
 * «Pago no encontrado».
 */
@Component({
  imports: [
    PageHeader,
    ResourceState,
    Card,
    Button,
    EmptyState,
    RouterLink,
    PaymentStatusBadge,
    AttemptsTable,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header title="Detalle de pago" description="Pago e historial de intentos de cobro.">
        <a actions app-button variant="secondary" routerLink="/admin/pagos">Volver a pagos</a>
      </app-page-header>

      @if (notFound()) {
        <app-empty-state
          title="Pago no encontrado"
          description="El pago no existe o el enlace no es válido."
          icon="receipt"
        >
          <a actions app-button routerLink="/admin/pagos">Ver pagos</a>
        </app-empty-state>
      } @else {
        <app-resource-state
          skeleton="detail"
          [loading]="resource.isLoading()"
          [error]="error()"
          (retry)="resource.reload()"
        >
          @if (payment(); as p) {
            <div class="space-y-6">
              <app-card padding="lg" class="space-y-6">
                <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt class="text-sm text-fg-muted">Estado</dt>
                    <dd><app-payment-status-badge [status]="p.status" /></dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Monto</dt>
                    <dd class="text-xl font-semibold">{{ cop(p.monto) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Método</dt>
                    <dd>{{ method(p) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Fecha</dt>
                    <dd>{{ date(p.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-fg-muted">Comprador</dt>
                    <dd>
                      <a
                        class="font-mono text-sm"
                        [routerLink]="['/admin/usuarios', p.buyerId]"
                        [attr.aria-label]="'Ver al comprador ' + p.buyerId"
                        >{{ short(p.buyerId) }}</a
                      >
                    </dd>
                  </div>
                  @if (p.referencia) {
                    <div>
                      <dt class="text-sm text-fg-muted">Referencia</dt>
                      <dd class="font-mono text-sm wrap-break-word">{{ p.referencia }}</dd>
                    </div>
                  }
                  @if (reason(); as r) {
                    <div class="sm:col-span-2 lg:col-span-3">
                      <dt class="text-sm text-fg-muted">Motivo de rechazo</dt>
                      <dd class="wrap-break-word">{{ r }}</dd>
                    </div>
                  }
                </dl>
                <div class="flex flex-wrap gap-2">
                  <a app-button variant="secondary" [routerLink]="['/admin/pedidos', p.orderId]">
                    Ver pedido
                  </a>
                </div>
              </app-card>

              <section aria-labelledby="intentos-titulo" class="space-y-3">
                <h2 id="intentos-titulo" class="text-2xl">Intentos</h2>
                @if (p.attempts.length > 0) {
                  <app-attempts-table [attempts]="p.attempts" />
                } @else {
                  <p class="text-fg-muted">Este pago aún no tiene intentos registrados.</p>
                }
              </section>
            </div>
          }
        </app-resource-state>
      }
    </div>
  `,
})
export class PagoDetalle {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.paramMap().get('id') ?? '');
  /** Con un id inválido no se pide nada. */
  private readonly validId = computed(() => (isObjectId(this.id()) ? this.id() : undefined));

  protected readonly resource = rxResource({
    params: () => this.validId(),
    stream: ({ params }) => this.api.getPayment(params),
  });

  protected readonly payment = computed<AdminPaymentDetail | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  private readonly apiError = computed(() => resourceApiError(this.resource.error()));
  protected readonly notFound = computed(() => !this.validId() || this.apiError()?.status === 404);
  protected readonly error = computed(() => paymentsError(this.apiError()));

  protected readonly reason = computed(() => rejectionMessage(this.payment()?.motivoRechazo));

  protected readonly cop = formatCop;
  protected readonly date = formatDateTime;
  protected readonly short = shortId;

  protected method(payment: AdminPaymentDetail): string {
    return paymentMethodLabel(payment.metodo);
  }
}
