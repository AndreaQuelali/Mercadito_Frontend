import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'mercadito_token';
const REFRESH_KEY = 'mercadito_refresh_token';
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let navigate: jasmine.Spy;

  /** Builds the app pieces with a stored session (the AuthService reads it when created) */
  function setup(session: { token?: string; refreshToken?: string } = {}) {
    localStorage.clear();
    if (session.token) localStorage.setItem(TOKEN_KEY, session.token);
    if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  }

  const isRefresh = (r: { url: string }) => r.url.endsWith('/auth/refresh');
  const isLogout = (r: { url: string }) => r.url.endsWith('/auth/logout');

  function expectRefresh(): TestRequest {
    return httpMock.expectOne(isRefresh);
  }

  function grantSession(req: TestRequest, token = 'new-access', refreshToken = 'new-refresh') {
    req.flush({ ok: true, message: 'Token refreshed', data: { id: 'u1', email: 'a@b.com', token, refreshToken } });
  }

  afterEach(() => {
    // Whatever is left over (e.g. the logout call) must have been handled by the test
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the access token to every request', () => {
    setup({ token: 'access-1' });

    http.get('/api/things').subscribe();

    const req = httpMock.expectOne('/api/things');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('sends no Authorization header without a session', () => {
    setup();

    http.get('/api/things').subscribe();

    const req = httpMock.expectOne('/api/things');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('passes through errors that are not 401 without touching the session', () => {
    setup({ token: 'access-1', refreshToken: 'refresh-1' });
    let error: HttpErrorResponse | undefined;

    http.get('/api/things').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/things').flush({}, { status: 500, statusText: 'Server Error' });

    expect(error?.status).toBe(500);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('access-1');
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('when the access token expired (401)', () => {
    it('renews the session once and retries the request with the new token', () => {
      setup({ token: 'old-access', refreshToken: 'old-refresh' });
      let result: unknown;

      http.get('/api/things').subscribe((r) => (result = r));
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);

      const refresh = expectRefresh();
      expect(refresh.request.body).toEqual({ refreshToken: 'old-refresh' });
      grantSession(refresh);

      const retry = httpMock.expectOne('/api/things');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      retry.flush({ ok: true });

      expect(result).toEqual({ ok: true });
      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-access');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('renews only once when several requests fail at the same time', () => {
      setup({ token: 'old-access', refreshToken: 'old-refresh' });
      const results: unknown[] = [];

      http.get('/api/a').subscribe((r) => results.push(r));
      http.get('/api/b').subscribe((r) => results.push(r));
      httpMock.expectOne('/api/a').flush({}, UNAUTHORIZED);
      httpMock.expectOne('/api/b').flush({}, UNAUTHORIZED);

      grantSession(expectRefresh()); // expectOne fails if there were two refresh calls

      httpMock.expectOne('/api/a').flush('a');
      httpMock.expectOne('/api/b').flush('b');
      expect(results.sort()).toEqual(['a', 'b']);
    });

    it('retries without renewing when another request already renewed the token', () => {
      setup({ token: 'old-access', refreshToken: 'old-refresh' });
      let result: unknown;

      http.get('/api/things').subscribe((r) => (result = r));
      const first = httpMock.expectOne('/api/things');
      auth.setToken('already-renewed');
      first.flush({}, UNAUTHORIZED);

      const retry = httpMock.expectOne('/api/things');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer already-renewed');
      retry.flush('ok');
      expect(result).toBe('ok');
      httpMock.expectNone(isRefresh);
    });

    it('ends the session if the retried request is rejected again, without a second renewal', () => {
      setup({ token: 'old-access', refreshToken: 'old-refresh' });
      let error: HttpErrorResponse | undefined;

      http.get('/api/things').subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);
      grantSession(expectRefresh());
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);

      expect(error?.status).toBe(401);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/auth/login');
      httpMock.expectOne(isLogout).flush({});
      httpMock.expectNone(isRefresh);
    });

    it('ends the session and goes to the login when the server rejects the refresh token', () => {
      setup({ token: 'old-access', refreshToken: 'revoked' });
      let error: HttpErrorResponse | undefined;

      http.get('/api/things').subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);
      expectRefresh().flush({ ok: false }, UNAUTHORIZED);

      expect(error?.status).toBe(401); // the caller still sees the original failure
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/auth/login');
      const logout = httpMock.expectOne(isLogout);
      expect(logout.request.body).toEqual({ refreshToken: 'revoked' });
      logout.flush({});
    });

    it('keeps the session when the server fails temporarily during the renewal', () => {
      setup({ token: 'old-access', refreshToken: 'refresh-1' });
      let error: HttpErrorResponse | undefined;

      http.get('/api/things').subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);
      expectRefresh().flush({}, { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(401);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('old-access');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
      expect(navigate).not.toHaveBeenCalled();
      httpMock.expectNone(isLogout);
    });

    it('keeps the session when the network is down during the renewal', () => {
      setup({ token: 'old-access', refreshToken: 'refresh-1' });

      http.get('/api/things').subscribe({ error: () => undefined });
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);
      expectRefresh().error(new ProgressEvent('error'), { status: 0 });

      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('goes straight to the login when there is no refresh token', () => {
      setup({ token: 'old-access' });
      let error: HttpErrorResponse | undefined;

      http.get('/api/things').subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/api/things').flush({}, UNAUTHORIZED);

      expect(error?.status).toBe(401);
      expect(navigate).toHaveBeenCalledWith('/auth/login');
      httpMock.expectNone(isRefresh);
      httpMock.expectNone(isLogout);
    });

    it('does not try to renew when an auth endpoint answers 401', () => {
      setup({ token: 'old-access', refreshToken: 'refresh-1' });
      let error: HttpErrorResponse | undefined;

      http.post('/auth/login', {}).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/auth/login').flush({}, UNAUTHORIZED);

      expect(error?.status).toBe(401);
      httpMock.expectNone(isRefresh);
      httpMock.expectOne(isLogout).flush({});
    });
  });
});
