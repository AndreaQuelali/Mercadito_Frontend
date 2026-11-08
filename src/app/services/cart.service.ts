import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    unit: string;
    image: string;
    stock: number;
    sellerId?: string;
    seller?: { id: string; businessName: string; location: string | null };
  };
}

export type Fulfillment = 'pickup' | 'delivery';

/** Delivery data of a purchase; `delivery` needs address and reference. */
export interface CheckoutRequest {
  fulfillment: Fulfillment;
  address?: string;
  addressRef?: string;
  contactPhone?: string;
  note?: string;
}

export interface CheckoutResult {
  checkoutId: string;
  orders: { id: number; sellerId: string; total: number | string }[];
}

/** The cart lines of one stand, with what they add up to. */
export interface SellerGroup {
  sellerId: string;
  businessName: string;
  location: string | null;
  items: CartItem[];
  subtotal: number;
}

/** Groups cart lines by stand, keeping the order in which each stand first appears. */
export function groupBySeller(items: CartItem[]): SellerGroup[] {
  const groups = new Map<string, SellerGroup>();
  for (const item of items) {
    const sellerId = item.product.seller?.id ?? item.product.sellerId ?? 'unknown';
    let group = groups.get(sellerId);
    if (!group) {
      group = {
        sellerId,
        businessName: item.product.seller?.businessName ?? 'Puesto',
        location: item.product.seller?.location ?? null,
        items: [],
        subtotal: 0,
      };
      groups.set(sellerId, group);
    }
    group.items.push(item);
    group.subtotal += item.quantity * item.product.price;
  }
  return [...groups.values()];
}

export interface Cart {
  id: number;
  items: CartItem[];
}

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private _cart = signal<Cart | null>(null);

  readonly items = computed(() => this._cart()?.items ?? []);
  readonly itemCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  readonly groups = computed(() => groupBySeller(this.items()));
  readonly total = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity * i.product.price, 0)
  );

  load(): Observable<Cart> {
    return this.http
      .get<ApiResponse<Cart>>(`${environment.apiUrl}/cart`)
      .pipe(
        map((r) => r.data),
        tap((cart) => this._cart.set(cart))
      );
  }

  addItem(productId: number, quantity = 1): Observable<Cart> {
    return this.http
      .post<ApiResponse<Cart>>(`${environment.apiUrl}/cart/add`, { productId, quantity })
      .pipe(
        map((r) => r.data),
        tap((cart) => this._cart.set(cart))
      );
  }

  updateItem(itemId: number, quantity: number): Observable<Cart> {
    return this.http
      .patch<ApiResponse<Cart>>(`${environment.apiUrl}/cart/item/${itemId}`, { quantity })
      .pipe(
        map((r) => r.data),
        tap((cart) => this._cart.set(cart))
      );
  }

  removeItem(itemId: number): Observable<Cart> {
    return this.http
      .delete<ApiResponse<Cart>>(`${environment.apiUrl}/cart/item/${itemId}`)
      .pipe(
        map((r) => r.data),
        tap((cart) => this._cart.set(cart))
      );
  }

  clear(): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${environment.apiUrl}/cart`)
      .pipe(
        map(() => undefined),
        tap(() => this._cart.set(null))
      );
  }

  /** One order per stand; they all share the `checkoutId` of this purchase. */
  checkout(delivery: CheckoutRequest): Observable<CheckoutResult> {
    return this.http
      .post<ApiResponse<CheckoutResult>>(`${environment.apiUrl}/cart/checkout`, delivery)
      .pipe(
        map((r) => r.data),
        tap(() => this._cart.set(null))
      );
  }
}
