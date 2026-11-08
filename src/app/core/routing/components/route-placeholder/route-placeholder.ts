import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Card } from '../../../../shared/ui/card/card';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { SESSION_ROLE_LABELS } from '../../../navigation';
import { RouteInfo } from '../../../navigation';

/**
 * Pantalla provisional de una ruta: muestra su título, para qué rol es, qué hará y qué endpoints
 * del backend consumirá. Lee todo de `Route.title` y `Route.data` (`RouteInfo`); SPEC 03 la
 * sustituye ruta a ruta por la pantalla real.
 */
@Component({
  imports: [PageHeader, Card, Badge],
  template: `
    <app-page-header [title]="title() ?? 'Pantalla'" [description]="info()?.description ?? null" />

    <app-card class="mt-8">
      <div class="space-y-6">
        <section aria-labelledby="ph-roles" class="space-y-2">
          <h2 id="ph-roles" class="text-lg">Para quién</h2>
          <div class="flex flex-wrap gap-2">
            @for (label of roleLabels(); track label) {
              <app-badge tone="info">{{ label }}</app-badge>
            }
          </div>
        </section>

        <section aria-labelledby="ph-endpoints" class="space-y-2">
          <h2 id="ph-endpoints" class="text-lg">Endpoints que consumirá</h2>
          <ul class="space-y-1">
            @for (endpoint of info()?.endpoints ?? []; track endpoint) {
              <li>
                <code class="rounded-sm bg-sunken px-2 py-1 text-sm break-all">{{ endpoint }}</code>
              </li>
            }
          </ul>
        </section>

        @if (params().length) {
          <section aria-labelledby="ph-params" class="space-y-2">
            <h2 id="ph-params" class="text-lg">Parámetros de la ruta</h2>
            <ul class="space-y-1">
              @for (param of params(); track param.name) {
                <li>
                  <code class="rounded-sm bg-sunken px-2 py-1 text-sm break-all">
                    {{ param.name }} = {{ param.value }}
                  </code>
                </li>
              }
            </ul>
          </section>
        }

        <p class="text-sm text-fg-muted">
          Esta pantalla aún no está maquetada: el diseño llega en la siguiente fase del MVP.
        </p>
      </div>
    </app-card>
  `,
})
export class RoutePlaceholder {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(this.route.title);
  protected readonly info = toSignal(this.route.data.pipe(map((data) => data as RouteInfo)));
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly roleLabels = computed(() => {
    const roles = this.info()?.roles ?? [];
    if (roles.length === Object.keys(SESSION_ROLE_LABELS).length) {
      return ['Todos'];
    }
    return roles.map((role) => SESSION_ROLE_LABELS[role] ?? role);
  });

  protected readonly params = computed(() => {
    const map = this.paramMap();
    return map ? map.keys.map((name) => ({ name, value: map.get(name) ?? '' })) : [];
  });
}
