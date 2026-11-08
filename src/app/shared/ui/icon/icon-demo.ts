import { Component } from '@angular/core';
import { Icon } from './icon';
import { ICON_PATHS } from './icon-paths';
import { IconName, IconSize } from './icon.types';

@Component({
  imports: [Icon],
  template: `
    <div class="mx-auto max-w-5xl space-y-10 p-4 sm:p-8">
      <h1 class="text-3xl sm:text-4xl">Icon (app-icon)</h1>

      <section aria-labelledby="icon-sizes" class="space-y-3">
        <h2 id="icon-sizes" class="text-xl">Tamaños</h2>
        <div class="flex items-center gap-6">
          @for (size of sizes; track size) {
            <span class="inline-flex items-center gap-2 text-sm text-fg-muted">
              <app-icon name="leaf" [size]="size" />
              {{ size }}
            </span>
          }
        </div>
      </section>

      <section aria-labelledby="icon-label" class="space-y-3">
        <h2 id="icon-label" class="text-xl">Con etiqueta accesible</h2>
        <app-icon name="alert" size="lg" label="Advertencia" class="text-warning" />
      </section>

      <section aria-labelledby="icon-all" class="space-y-3">
        <h2 id="icon-all" class="text-xl">Catálogo</h2>
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          @for (name of names; track name) {
            <li
              class="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-3"
            >
              <app-icon [name]="name" size="lg" />
              <code class="text-xs text-fg-muted">{{ name }}</code>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class IconDemo {
  protected readonly sizes: IconSize[] = ['sm', 'md', 'lg'];
  protected readonly names = Object.keys(ICON_PATHS) as IconName[];
}
