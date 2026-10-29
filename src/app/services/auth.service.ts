import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
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
  data: { token: string; refreshToken: string; id: string; email: string };
}

export interface RefreshResponse {
  ok: boolean;
  message: string;
  data: { token: string; refreshToken: string; id: string; email: string };
}

export interface RegisterResponse {
  ok: boolean;
  message: string;
  data: { id: string; email: string };
}

const TOKEN_KEY = 'mercadito_token';
const REFRESH_KEY = 'mercadito_refresh_token';

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

  /** In-flight refresh shared by every caller, so concurrent 401s rotate the token only once */
  private refresh$: Observable<string> | null = null;

  getToken(): string | null {
    return this._token();
  }

  hasRefreshToken(): boolean {
    return !!localStorage.getItem(REFRESH_KEY);
  }

  /**
   * Exchanges the stored refresh token for a new session (access + rotated refresh token).
   * Emits the new access token; errors if there is no refresh token or the server rejects it.
   */
  refresh(): Observable<string> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    if (!this.refresh$) {
      this.refresh$ = this.http
        .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
        .pipe(
          map((res) => {
            if (!res.ok || !res.data?.token || !res.data?.refreshToken) {
              throw new Error('Refresh failed');
            }
            this._setSession(res.data.token, res.data.refreshToken);
            return res.data.token;
          }),
          finalize(() => (this.refresh$ = null)),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.refresh$;
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
            this._setSession(res.data.token, res.data.refreshToken);
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

  forgotPassword(email: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(
      `${environment.apiUrl}/auth/password/forgot`,
      { email }
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(
      `${environment.apiUrl}/auth/password/reset`,
      { token, newPassword }
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._token.set(null);
    // Revoke the session on the server (best effort; the local session is already gone)
    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this._sellerStatus.set(null);
    this.router.navigateByUrl('/');
  }

  private _setSession(token: string, refreshToken: string): void {
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    this._setToken(token);
  }

  private _setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }
}
