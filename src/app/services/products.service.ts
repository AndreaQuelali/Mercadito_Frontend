import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ProductCard } from '../components/product-card/product-card.component';

const API_BASE = 'http://localhost:3001';

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
}

interface ProductDto {
  id: number;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
  description: string;
  image: string;
  seller?: { firstName?: string; lastName?: string } | string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  list(params?: { name?: string; category?: string; minPrice?: number; maxPrice?: number }): Observable<ProductCard[]> {
    let httpParams = new HttpParams();
    if (params?.name) httpParams = httpParams.set('name', params.name);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.minPrice != null) httpParams = httpParams.set('minPrice', String(params.minPrice));
    if (params?.maxPrice != null) httpParams = httpParams.set('maxPrice', String(params.maxPrice));

    return this.http
      .get<ApiResponse<ProductDto[] | null>>(`${API_BASE}/product`, { params: httpParams })
      .pipe(
        map((res) => (res?.data ?? [])),
        map((items: ProductDto[]) =>
          items.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            unit: p.unit,
            image: p.image,
            featured: false,
            seller: typeof p.seller === 'string' ? p.seller : undefined,
          }))
        )
      );
  }

  listSeller(): Observable<ProductCard[]> {
    return this.http
      .get<ApiResponse<ProductDto[] | null>>(`${API_BASE}/product/mine`)
      .pipe(
        map((res) => (res?.data ?? [])),
        map((items: ProductDto[]) => items.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          unit: p.unit,
          image: p.image,
          featured: false,
          seller: typeof p.seller === 'string' ? p.seller : undefined,
        })))
      );
  }

  create(payload: {
    name: string;
    description: string;
    price: number;
    unit: 'Kilogramo' | 'Unidad' | 'Frasco' | 'Litro';
    stock: number;
    category: 'Verduras' | 'Frutas' | 'Panadería' | 'Lácteos' | 'Artesanías';
    image: string;
  }): Observable<ApiResponse<ProductDto>> {
    return this.http.post<ApiResponse<ProductDto>>(`${API_BASE}/product`, payload as any);
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/product/${id}`);
  }
}
