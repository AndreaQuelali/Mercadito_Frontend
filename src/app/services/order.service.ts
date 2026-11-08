import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export type Fulfillment = 'pickup' | 'delivery';

export interface OrderItem {
  id: number;
  quantity: number;
  /** Unit price at purchase time (decimal string from the API) */
  price: number | string;
  product: { id: number; name: string; image: string; unit: string };
}

/** An order belongs to one stand; the orders of one purchase share a `checkoutId`. */
export interface Order {
  id: number;
  sellerId: string;
  checkoutId: string;
  status: OrderStatus;
  total: number | string;
  fulfillment: Fulfillment;
  address: string | null;
  addressRef: string | null;
  contactPhone: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
  seller?: { id: string; businessName: string; location: string | null };
  /** Seller view only: who bought */
  user?: { firstName: string; lastName: string };
}

/** What the buyer sees: one purchase with its order per stand. */
export interface Purchase {
  checkoutId: string;
  createdAt: string;
  fulfillment: Fulfillment;
  total: number;
  orders: Order[];
}

interface ApiResponse<T> { ok: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  listMine(): Observable<Purchase[]> {
    return this.http
      .get<ApiResponse<Purchase[]>>(`${environment.apiUrl}/order`)
      .pipe(map((r) => r.data ?? []));
  }

  getById(id: number): Observable<Order> {
    return this.http
      .get<ApiResponse<Order>>(`${environment.apiUrl}/order/${id}`)
      .pipe(map((r) => r.data));
  }

  listSeller(): Observable<Order[]> {
    return this.http
      .get<ApiResponse<Order[]>>(`${environment.apiUrl}/order/seller/mine`)
      .pipe(map((r) => r.data ?? []));
  }

  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http
      .patch<ApiResponse<Order>>(`${environment.apiUrl}/order/${id}/status`, { status })
      .pipe(map((r) => r.data));
  }
}
