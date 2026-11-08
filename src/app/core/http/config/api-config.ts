import { InjectionToken } from '@angular/core';

/** Prefijo de la API. En desarrollo `ng serve` lo reenvía al backend (`proxy.conf.json`). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
