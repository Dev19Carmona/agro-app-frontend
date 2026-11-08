import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'ui/table',
    loadComponent: () => import('./shared/ui/table/table-demo').then((m) => m.TableDemo),
  },
];
