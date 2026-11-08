import { Component, input, model } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { DrawerSide } from './drawer.types';

/**
 * Panel lateral modal (drawer) que entra por un lado, con fondo oscurecido.
 *
 * Envuelve el contenido de la página, que va en el slot por defecto; el panel va en el slot
 * `[drawerPanel]`:
 *
 * ```html
 * <app-drawer [(open)]="open" label="Navegación">
 *   <nav drawerPanel>…</nav>
 *   <header>…</header>
 *   <main>…</main>
 * </app-drawer>
 * ```
 *
 * Cierra con Esc, con clic en el fondo o poniendo `open` en `false`. Al abrir, el foco pasa al
 * primer elemento enfocable del panel y al cerrar vuelve a quien lo tenía. El contenido de la
 * página queda inerte mientras el drawer está abierto.
 *
 * Valores por defecto: `open=false`, `side='end'`. `label` es obligatorio (nombre accesible).
 */
@Component({
  selector: 'app-drawer',
  imports: [MatSidenavContainer, MatSidenav, MatSidenavContent],
  template: `
    <mat-sidenav-container [hasBackdrop]="true" (backdropClick)="open.set(false)">
      <mat-sidenav
        mode="over"
        fixedInViewport
        role="dialog"
        aria-modal="true"
        [position]="side()"
        [opened]="open()"
        [attr.aria-label]="label()"
        (openedStart)="open.set(true)"
        (closedStart)="open.set(false)"
      >
        <ng-content select="[drawerPanel]" />
      </mat-sidenav>
      <mat-sidenav-content>
        <ng-content />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: block;
    }

    /* El contenedor y el contenido de Material recortan el desbordamiento; aquí no, para que
       un header con position: sticky dentro de la página siga pegado al viewport. */
    /* El fondo oscuro mide lo que el contenedor: con min-height cubre siempre el viewport. */
    mat-sidenav-container {
      min-height: 100dvh;
      overflow: visible;
      background: transparent;
      --mat-sidenav-scrim-color: rgb(0 30 43 / 55%);
    }

    mat-sidenav-content {
      overflow: visible;
    }

    /* Material aplica este radio solo a las esquinas del lado que da al contenido. */
    mat-sidenav {
      --mat-sidenav-container-width: min(20rem, 88vw);
      --mat-sidenav-container-shape: var(--radius-xl);
      border: 1px solid var(--c-line);
    }
  `,
})
export class Drawer {
  /** Si el panel está abierto. Se puede enlazar con `[(open)]`. */
  readonly open = model(false);
  readonly side = input<DrawerSide>('end');
  readonly label = input.required<string>();
}
