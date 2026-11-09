import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  Directive,
  ElementRef,
  Component,
  computed,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { PopoverAlign } from './popover.types';

let nextId = 0;

/**
 * Disparador de un `app-popover`: se pone sobre el botón proyectado en `appPopoverTrigger`.
 * Pone `aria-expanded`, `aria-controls` y `aria-haspopup`, y abre o cierra el panel con el clic
 * (Enter y Espacio en un `<button>` nativo lo disparan solos).
 */
@Directive({
  selector: '[appPopoverTrigger]',
  host: {
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'popover.open()',
    '[attr.aria-controls]': 'popover.open() ? popover.panelId : null',
    '(click)': 'popover.toggle()',
  },
})
export class PopoverTrigger {
  protected readonly popover = inject(Popover);
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    this.popover.registerTrigger(this);
  }
}

/**
 * Panel anclado a un botón (no modal). El botón se proyecta con `appPopoverTrigger` y el contenido
 * del panel, sin selector.
 *
 * ```html
 * <app-popover [(open)]="open" ariaLabel="Notificaciones" align="end">
 *   <button appPopoverTrigger app-button iconOnly ariaLabel="Notificaciones">…</button>
 *   @if (open()) { <p>Contenido del panel</p> }
 * </app-popover>
 * ```
 *
 * - Abre con clic o Enter; cierra con Esc (el foco vuelve al botón) o con un clic fuera.
 * - Al abrir, el foco pasa al panel; no lo atrapa, así que Tab sigue siendo libre.
 * - El contenido proyectado se crea siempre: para cargar datos solo al abrir, envuélvelo en
 *   `@if (open())`.
 * - Ancho: `min(24rem, 100vw - 2rem)`, sin scroll horizontal de página en 360 px.
 *
 * Valores por defecto: `open=false`, `align='start'`. `ariaLabel` es obligatorio (nombra el panel).
 */
@Component({
  selector: 'app-popover',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin],
  template: `
    <span cdkOverlayOrigin #origin="cdkOverlayOrigin" class="inline-flex">
      <ng-content select="[appPopoverTrigger]" />
    </span>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions()"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayViewportMargin]="16"
      (overlayOutsideClick)="onOutsideClick($event)"
      (overlayKeydown)="onKeydown($event)"
      (attach)="focusPanel()"
      (detach)="open.set(false)"
    >
      <div
        #panel
        role="dialog"
        tabindex="-1"
        [id]="panelId"
        [attr.aria-label]="ariaLabel()"
        class="max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface text-fg shadow-lg outline-none"
      >
        <ng-content />
      </div>
    </ng-template>
  `,
  host: { class: 'inline-flex' },
})
export class Popover {
  /** Si el panel está abierto. Se puede enlazar con `[(open)]`. */
  readonly open = model(false);
  /** Nombre accesible del panel. */
  readonly ariaLabel = input.required<string>();
  readonly align = input<PopoverAlign>('start');

  readonly panelId = `app-popover-${nextId++}`;

  private trigger: PopoverTrigger | null = null;
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly positions = computed((): ConnectedPosition[] => {
    const originX = this.align() === 'end' ? 'end' : 'start';
    return [
      { originX, originY: 'bottom', overlayX: originX, overlayY: 'top', offsetY: 8 },
      { originX, originY: 'top', overlayX: originX, overlayY: 'bottom', offsetY: -8 },
    ];
  });

  /** Lo llama el disparador al crearse. */
  registerTrigger(trigger: PopoverTrigger): void {
    this.trigger = trigger;
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  /** Cierra el panel; con `restoreFocus` el foco vuelve al botón que lo abrió. */
  close(restoreFocus = true): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger?.element.focus();
    }
  }

  protected onOutsideClick(event: MouseEvent): void {
    // Un clic en el propio botón lo gestiona `toggle()`; cerrar aquí lo reabriría.
    if (this.trigger?.element.contains(event.target as Node)) {
      return;
    }
    this.close(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected focusPanel(): void {
    this.panel()?.nativeElement.focus({ preventScroll: true });
  }
}
