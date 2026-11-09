import { Component, computed, input } from '@angular/core';
import type { UserStatus } from '../../../../core/auth';
import { Badge } from '../../../../shared/ui/badge/badge';
import { userStatusLabel, userStatusTone } from '../../utils/user-labels';

/** Estado de una cuenta como badge: el significado va en el texto y el color solo lo refuerza. */
@Component({
  selector: 'app-user-status-badge',
  imports: [Badge],
  template: `<app-badge [tone]="tone()">{{ label() }}</app-badge>`,
  host: { class: 'inline-flex' },
})
export class UserStatusBadge {
  readonly status = input.required<UserStatus>();

  protected readonly label = computed(() => userStatusLabel(this.status()));
  protected readonly tone = computed(() => userStatusTone(this.status()));
}
