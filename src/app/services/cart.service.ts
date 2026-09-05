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
  };
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

  checkout(): Observable<{ orderId: number }> {
    return this.http
      .post<ApiResponse<{ orderId: number }>>(`${environment.apiUrl}/cart/checkout`, {})
      .pipe(
        map((r) => r.data),
        tap(() => this._cart.set(null))
      );
  }
}
