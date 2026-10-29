import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);
  private router = inject(Router);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return this.send(req, next, true);
  }

  /** Sends the request; on a 401 renews the session once and retries it. */
  private send(
    req: HttpRequest<unknown>,
    next: HttpHandler,
    canRefresh: boolean
  ): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 401) return throwError(() => err);

        // Auth endpoints (login, refresh, logout...) or nothing to renew with: session is over
        if (!canRefresh || req.url.includes('/auth/') || !this.auth.hasRefreshToken()) {
          this.expireSession();
          return throwError(() => err);
        }

        // Another request already renewed the session while this one was in flight
        if (token && this.auth.getToken() !== token) {
          return this.send(req, next, false);
        }

        return this.auth.refresh().pipe(
          catchError((refreshErr: unknown) => {
            // Only drop the session if the server rejected it; keep it on outages
            if (this.isSessionRejected(refreshErr)) this.expireSession();
            return throwError(() => err);
          }),
          switchMap(() => this.send(req, next, false))
        );
      })
    );
  }

  private isSessionRejected(err: unknown): boolean {
    if (err instanceof HttpErrorResponse) return err.status === 400 || err.status === 401;
    return true; // no refresh token / malformed refresh response
  }

  private expireSession(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
