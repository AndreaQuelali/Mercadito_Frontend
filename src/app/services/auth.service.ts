import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'client' | 'seller' | 'admin';

export interface AuthUser {
  sub: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  ok: boolean;
  message: string;
  data: { token: string; user: { id: number; firstName: string; lastName: string; email: string; role: UserRole } };
}

export interface RegisterResponse {
  ok: boolean;
  message: string;
  data: { id: number; email: string; firstName: string; lastName: string; role: UserRole };
}

const TOKEN_KEY = 'mercadito_token';

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role ?? 'client',
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
  readonly currentUser = computed<AuthUser | null>(() => {
    const t = this._token();
    return t ? parseJwt(t) : null;
  });

  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isSeller = computed(() => {
    const u = this.currentUser();
    return u?.role === 'seller' || u?.role === 'admin';
  });

  getToken(): string | null {
    return this._token();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.ok && res.data?.token) {
            this._setToken(res.data.token);
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
    this.router.navigateByUrl('/');
  }

  private _setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }
}
