import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  product: { id: number; name: string; image: string; unit: string };
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

interface ApiResponse<T> { ok: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  listMine(): Observable<Order[]> {
    return this.http
      .get<ApiResponse<Order[]>>(`${environment.apiUrl}/order`)
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
