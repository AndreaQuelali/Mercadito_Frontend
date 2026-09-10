import { Injectable, inject } from '@angular/core';
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
      })
    );
  }

  getMine(): Observable<Seller> {
    return this.http.get<ApiResponse<Seller>>(`${this.base}/mine`).pipe(
      map((res) => {
        if (!res.ok || !res.data) throw new Error(res.message || 'Seller not found');
        return res.data;
      }),
      tap((seller) => this.auth.setSellerStatus(seller.status))
    );
  }

  updateMine(payload: UpdateSellerPayload): Observable<Seller> {
    return this.http.patch<ApiResponse<Seller>>(`${this.base}/mine`, payload).pipe(
      map((res) => {
        if (!res.ok || !res.data) throw new Error(res.message || 'Update failed');
        return res.data;
      }),
      tap((seller) => this.auth.setSellerStatus(seller.status))
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
