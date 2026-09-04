import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);

  listByProduct(productId: number): Observable<Review[]> {
    return this.http
      .get<ApiResponse<Review[]>>(`${environment.apiUrl}/review/product/${productId}`)
      .pipe(map((r) => r.data ?? []));
  }

  create(productId: number, orderId: number, rating: number, comment: string): Observable<Review> {
    return this.http
      .post<ApiResponse<Review>>(`${environment.apiUrl}/review`, { productId, orderId, rating, comment })
      .pipe(map((r) => r.data));
  }
}
