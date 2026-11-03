import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard, authGuard, noSellerGuard, sellerGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

interface FakeAuth {
  loggedIn: boolean;
  seller: boolean;
  admin: boolean;
}

describe('route guards', () => {
  let router: Router;
  let state: FakeAuth;

  beforeEach(() => {
    state = { loggedIn: false, seller: false, admin: false };
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => state.loggedIn,
            hasSeller: () => state.seller,
            isAdmin: () => state.admin,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  function run(guard: CanActivateFn, url = '/dashboard/orders') {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    );
  }

  const urlOf = (result: unknown) => router.serializeUrl(result as UrlTree);

  describe('authGuard', () => {
    it('lets a logged in user through', () => {
      state.loggedIn = true;

      expect(run(authGuard)).toBeTrue();
    });

    it('sends a guest to the login and remembers where they were going', () => {
      const result = run(authGuard, '/cart');

      expect(urlOf(result)).toBe('/auth/login?returnUrl=%2Fcart');
    });
  });

  describe('sellerGuard', () => {
    it('lets a logged in seller through', () => {
      state.loggedIn = true;
      state.seller = true;

      expect(run(sellerGuard)).toBeTrue();
    });

    it('sends a logged in user without a store to the onboarding', () => {
      state.loggedIn = true;

      expect(urlOf(run(sellerGuard))).toBe('/seller/onboarding');
    });

    it('sends a guest to the login with the return url', () => {
      expect(urlOf(run(sellerGuard, '/dashboard/sales'))).toBe('/auth/login?returnUrl=%2Fdashboard%2Fsales');
    });
  });

  describe('noSellerGuard', () => {
    it('lets a logged in user without a store through', () => {
      state.loggedIn = true;

      expect(run(noSellerGuard)).toBeTrue();
    });

    it('sends a user who already has a store to the dashboard', () => {
      state.loggedIn = true;
      state.seller = true;

      expect(urlOf(run(noSellerGuard))).toBe('/dashboard');
    });

    it('sends a guest to the login', () => {
      expect(urlOf(run(noSellerGuard, '/seller/onboarding'))).toBe(
        '/auth/login?returnUrl=%2Fseller%2Fonboarding'
      );
    });
  });

  describe('adminGuard', () => {
    it('lets an admin through', () => {
      state.loggedIn = true;
      state.admin = true;

      expect(run(adminGuard)).toBeTrue();
    });

    it('sends a regular user home', () => {
      state.loggedIn = true;

      expect(urlOf(run(adminGuard))).toBe('/');
    });

    it('sends a guest home', () => {
      expect(urlOf(run(adminGuard))).toBe('/');
    });

    it('does not accept an admin flag without a session', () => {
      state.admin = true;

      expect(urlOf(run(adminGuard))).toBe('/');
    });
  });
});
