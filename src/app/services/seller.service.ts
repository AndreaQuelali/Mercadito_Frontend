import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, SellerStatus } from './auth.service';

export interface Seller {
  id: string;
  userId: string;
  businessName: string;
  description?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  acceptsCash?: boolean;
  acceptsQr?: boolean;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
  status: SellerStatus;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateSellerPayload {
  businessName: string;
  description?: string;
  avatarUrl?: string;
  location?: string;
}

export interface UpdateSellerPayload {
  businessName?: string;
  description?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  acceptsCash?: boolean;
  acceptsQr?: boolean;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
}

export type SalesStatus = 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface SalesSummary {
  range: { from: string | null; to: string | null };
  /** Decimal string, e.g. "42.00" */
  total: string;
  ordersCount: number;
  unitsSold: number;
  ordersByStatus: Record<SalesStatus, number>;
  topProducts: { productId: number; name: string; image?: string; units: number; revenue: string }[];
}

export type SellerEventKey = 'order:new' | 'stock:low' | 'review:new';

export interface NotificationSettings {
  preferences: Record<SellerEventKey, boolean>;
  /** A sale that leaves a product at or below this stock triggers `stock:low`. Set by the server */
  lowStockThreshold: number;
}

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data?: T;
  token?: string;
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${environment.apiUrl}/seller`;

  private _mine = signal<Seller | null>(null);
  readonly mine = this._mine.asReadonly();

  create(payload: CreateSellerPayload): Observable<{ seller: Seller; token: string }> {
    return this.http.post<ApiResponse<Seller>>(this.base, payload).pipe(
      map((res) => {
        if (!res.ok || !res.data || !res.token) {
          throw new Error(res.message || 'No se pudo crear el perfil de vendedor');
        }
        return { seller: res.data, token: res.token };
      }),
      tap(({ seller, token }) => {
        this.auth.setToken(token);
        this.auth.setSellerStatus(seller.status);
        this._mine.set(seller);
      })
    );
  }

  getMine(): Observable<Seller> {
    return this.http.get<ApiResponse<Seller>>(`${this.base}/mine`).pipe(
      map((res) => {
        if (!res.ok || !res.data) throw new Error(res.message || 'Seller not found');
        return res.data;
      }),
      tap((seller) => {
        this.auth.setSellerStatus(seller.status);
        this._mine.set(seller);
      })
    );
  }

  updateMine(payload: UpdateSellerPayload): Observable<Seller> {
    return this.http.patch<ApiResponse<Seller>>(`${this.base}/mine`, payload).pipe(
      map((res) => {
        if (!res.ok || !res.data) throw new Error(res.message || 'Update failed');
        return res.data;
      }),
      tap((seller) => {
        this.auth.setSellerStatus(seller.status);
        this._mine.set(seller);
      })
    );
  }

  getNotificationSettings(): Observable<NotificationSettings> {
    return this.http
      .get<ApiResponse<NotificationSettings>>(`${this.base}/notification-settings`)
      .pipe(map((res) => this.settingsOf(res)));
  }

  /** Partial update: send only the events that change. */
  updateNotificationSettings(
    patch: Partial<Record<SellerEventKey, boolean>>
  ): Observable<NotificationSettings> {
    return this.http
      .patch<ApiResponse<NotificationSettings>>(`${this.base}/notification-settings`, patch)
      .pipe(map((res) => this.settingsOf(res)));
  }

  private settingsOf(res: ApiResponse<NotificationSettings>): NotificationSettings {
    if (!res.ok || !res.data) throw new Error(res.message || 'Settings not available');
    return res.data;
  }

  /** Sales summary of my store. Without a range it covers all time. */
  getSales(range: { from?: Date; to?: Date } = {}): Observable<SalesSummary> {
    const params: Record<string, string> = {};
    if (range.from) params['from'] = range.from.toISOString();
    if (range.to) params['to'] = range.to.toISOString();

    return this.http.get<ApiResponse<SalesSummary>>(`${this.base}/sales`, { params }).pipe(
      map((res) => {
        if (!res.ok || !res.data) throw new Error(res.message || 'Sales not available');
        return res.data;
      })
    );
  }

  listAll(): Observable<Seller[]> {
    return this.http.get<ApiResponse<Seller[]>>(this.base).pipe(
      map((res) => (res.ok && res.data ? res.data : []))
    );
  }

  updateStatus(id: string, status: SellerStatus): Observable<Seller> {
    return this.http
      .patch<ApiResponse<Seller>>(`${this.base}/${id}/status`, { status })
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) throw new Error(res.message || 'Status update failed');
          return res.data;
        })
      );
  }
}
