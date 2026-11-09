import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { SessionService } from '../../auth';
import { ApiError, toApiError } from '../../http';
import { CartItem, CartStatus, MAX_CART_QUANTITY } from '../models/cart.types';
import { CartApi } from './cart-api';

/** Resultado de una acción sobre el carrito; el error ya viene como `ApiError`. */
export type CartResult = { ok: true } | { ok: false; error: ApiError };

/** Resultado de `add`: la cantidad que quedó y si se recortó al máximo. */
export type CartAddResult =
  | { ok: true; cantidad: number; recortada: boolean }
  | { ok: false; error: ApiError };

/**
 * Carrito del `PRODUCTOR`. El backend es la única fuente de verdad: tras cada acción se vuelve a
 * pedir `GET /orders/cart`. Se carga al quedar la sesión como `PRODUCTOR` y se vacía al dejar de
 * serlo (o al cambiar de usuario). Un error de carga deja `status = 'error'` sin borrar las líneas
 * que ya se conocían.
 */
@Service()
export class CartService {
  private readonly api = inject(CartApi);
  private readonly session = inject(SessionService);

  private readonly _items = signal<CartItem[]>([]);
  private readonly _total = signal(0);
  private readonly _status = signal<CartStatus>('idle');
  private readonly _error = signal<ApiError | null>(null);
  /** Se incrementa al vaciar o cambiar de sesión: una respuesta anterior se descarta. */
  private generation = 0;

  readonly items = this._items.asReadonly();
  /** Total informativo del backend (solo líneas aptas). */
  readonly total = this._total.asReadonly();
  readonly status = this._status.asReadonly();
  /** Último error de carga, o `null`. */
  readonly error = this._error.asReadonly();
  /** Número de líneas (no la suma de unidades). */
  readonly count = computed(() => this._items().length);
  /** `true` si alguna línea no se puede comprar. */
  readonly hasInvalidLines = computed(() => this._items().some((item) => !item.apta));

  constructor() {
    effect(() => {
      const buyerId = this.session.role() === 'PRODUCTOR' ? (this.session.user()?.id ?? null) : null;
      untracked(() => {
        this.reset();
        if (buyerId) {
          void this.load();
        }
      });
    });
  }

  /** Pide el carrito. Solo pasa a `loading` si aún no hay datos válidos que mostrar. */
  async load(): Promise<void> {
    const generation = this.generation;
    if (this._status() !== 'ready') {
      this._status.set('loading');
    }
    try {
      const cart = await firstValueFrom(this.api.get());
      if (generation !== this.generation) {
        return;
      }
      this._items.set(cart.items);
      this._total.set(cart.total);
      this._error.set(null);
      this._status.set('ready');
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this._error.set(error as ApiError);
      this._status.set('error');
    }
  }

  /** Suma `cantidad` a la que ya hay de la presentación (tope `MAX_CART_QUANTITY`). */
  async add(variantId: string, cantidad: number): Promise<CartAddResult> {
    if (this._status() !== 'ready') {
      await this.load();
    }
    if (this._status() !== 'ready') {
      return { ok: false, error: this._error() ?? toApiError(null) };
    }
    const existing = this._items().find((item) => item.variantId === variantId)?.cantidad ?? 0;
    const wanted = existing + cantidad;
    const final = Math.min(wanted, MAX_CART_QUANTITY);
    const result = await this.mutate(this.api.setItem(variantId, final));
    return result.ok ? { ok: true, cantidad: final, recortada: wanted > MAX_CART_QUANTITY } : result;
  }

  /** Fija la cantidad de una línea (valor absoluto). */
  setQuantity(variantId: string, cantidad: number): Promise<CartResult> {
    return this.mutate(this.api.setItem(variantId, cantidad));
  }

  remove(variantId: string): Promise<CartResult> {
    return this.mutate(this.api.removeItem(variantId));
  }

  clear(): Promise<CartResult> {
    return this.mutate(this.api.clear());
  }

  /** Vacía el estado local (sin tocar el backend). Descarta respuestas en vuelo. */
  reset(): void {
    this.generation++;
    this._items.set([]);
    this._total.set(0);
    this._error.set(null);
    this._status.set('idle');
  }

  private async mutate(action: Observable<void>): Promise<CartResult> {
    const generation = this.generation;
    try {
      await firstValueFrom(action, { defaultValue: undefined });
    } catch (error) {
      return { ok: false, error: error as ApiError };
    }
    if (generation === this.generation) {
      await this.load();
    }
    return { ok: true };
  }
}
