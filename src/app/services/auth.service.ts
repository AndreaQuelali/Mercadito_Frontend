import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'user' | 'admin';
export type SellerStatus = 'active' | 'suspended';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  sellerId: string | null;
}

export interface LoginResponse {
  ok: boolean;
  message: string;
  data: { token: string; id: string; email: string };
}

export interface RegisterResponse {
  ok: boolean;
  message: string;
  data: { id: string; email: string };
}

const TOKEN_KEY = 'mercadito_token';

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const role: UserRole = decoded.role === 'admin' ? 'admin' : 'user';
    return {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role,
      sellerId: decoded.sellerId ?? null,
    };
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _sellerStatus = signal<SellerStatus | null>(null);

  readonly currentUser = computed<AuthUser | null>(() => {
    const t = this._token();
    return t ? parseJwt(t) : null;
  });

  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly hasSeller = computed(() => !!this.currentUser()?.sellerId);
  readonly sellerStatus = computed(() => this._sellerStatus());
  readonly isSellerActive = computed(() => {
    if (!this.hasSeller()) return false;
    const status = this._sellerStatus();
    return status === null || status === 'active';
  });
  readonly canManageStore = computed(() => this.isSellerActive());

  /** @deprecated use hasSeller / canManageStore */
  readonly isSeller = computed(() => this.hasSeller());

  getToken(): string | null {
    return this._token();
  }

  setToken(token: string): void {
    this._setToken(token);
  }

  setSellerStatus(status: SellerStatus | null): void {
    this._sellerStatus.set(status);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.ok && res.data?.token) {
            this._setToken(res.data.token);
            this._sellerStatus.set(null);
          }
        })
      );
  }

  register(firstName: string, lastName: string, email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, {
      firstName,
      lastName,
      email,
      password,
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this._sellerStatus.set(null);
    this.router.navigateByUrl('/');
  }

  private _setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }
}
