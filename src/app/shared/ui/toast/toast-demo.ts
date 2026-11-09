import { Component, inject } from '@angular/core';
import { Button } from '../button/button';
import { ToastService } from './toast-service';
import { ToastTone } from './toast.types';

@Component({
  imports: [Button],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Toast (app-toast)</h1>
      <p class="text-fg-muted">
        Los toasts salen de <code>ToastService</code> y se pintan en el contenedor global. Se
        cierran solos a los 6 s; pasa el puntero o el foco por encima para pausar el plazo.
      </p>

      <section aria-labelledby="toast-tones" class="space-y-3">
        <h2 id="toast-tones" class="text-xl">Tonos</h2>
        <div class="flex flex-wrap gap-3">
          @for (tone of tones; track tone) {
            <button app-button variant="secondary" (click)="show(tone)">{{ tone }}</button>
          }
        </div>
      </section>

      <section aria-labelledby="toast-extra" class="space-y-3">
        <h2 id="toast-extra" class="text-xl">Con enlace y texto largo</h2>
        <div class="flex flex-wrap gap-3">
          <button app-button variant="secondary" (click)="withLink()">Con enlace</button>
          <button app-button variant="secondary" (click)="long()">Id de 24 caracteres</button>
          <button app-button variant="ghost" (click)="toasts.clear()">Cerrar todos</button>
        </div>
      </section>
    </div>
  `,
})
export class ToastDemo {
  protected readonly toasts = inject(ToastService);
  protected readonly tones: ToastTone[] = ['brand', 'info', 'warning', 'danger'];

  protected show(tone: ToastTone): void {
    this.toasts.show({ title: `Aviso ${tone}`, message: 'Mensaje de ejemplo.', tone });
  }

  protected withLink(): void {
    this.toasts.show({
      title: 'y 3 avisos más',
      tone: 'info',
      link: { label: 'Ver todas', url: '/notificaciones' },
    });
  }

  protected long(): void {
    this.toasts.show({
      title: 'Pago aprobado',
      message: 'El pago del pedido 64f0c0a1b2c3d4e5f6a7b8c9 fue aprobado.',
      tone: 'brand',
    });
  }
}
