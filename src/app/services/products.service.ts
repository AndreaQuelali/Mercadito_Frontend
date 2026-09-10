import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ProductCard } from '../components/product-card/product-card.component';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl;

export type ProductUnit = 'kilogramo' | 'unidad' | 'frasco' | 'litro';
export type ProductCategory = 'verduras' | 'frutas' | 'panaderia' | 'lacteos' | 'artesanias';

export interface ProductDto {
  id: number;
  name: string;
  price: number;
  stock: number;
  unit: ProductUnit;
  category: ProductCategory;
  description: string;
  image: string;
  seller?: { id?: number; firstName?: string; lastName?: string } | string;
}

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
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
            stock: p.stock,
            category: p.category,
            image: p.image,
            featured: false,
            seller: typeof p.seller === 'object' && p.seller
              ? `${p.seller.firstName ?? ''} ${p.seller.lastName ?? ''}`.trim()
              : typeof p.seller === 'string' ? p.seller : undefined,
          }))
        )
      );
  }

  getById(id: number): Observable<ProductDto> {
    return this.http
      .get<ApiResponse<ProductDto>>(`${API_BASE}/product/${id}`)
      .pipe(map((res) => res.data));
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
          stock: p.stock,
          category: p.category,
          image: p.image,
          featured: false,
        })))
      );
  }

  create(payload: {
    name: string;
    description: string;
    price: number;
    unit: ProductUnit;
    stock: number;
    category: ProductCategory;
    image: string;
  }): Observable<ApiResponse<ProductDto>> {
    return this.http.post<ApiResponse<ProductDto>>(`${API_BASE}/product`, payload);
  }

  update(id: number, payload: Partial<{
    name: string;
    description: string;
    price: number;
    unit: ProductUnit;
    stock: number;
    category: ProductCategory;
    image: string;
  }>): Observable<ApiResponse<ProductDto>> {
    return this.http.put<ApiResponse<ProductDto>>(`${API_BASE}/product/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/product/${id}`);
  }
}
