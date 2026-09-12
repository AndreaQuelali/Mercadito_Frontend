import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

function loginTree(router: Router, returnUrl?: string) {
  return router.createUrlTree(['/auth/login'], {
    queryParams: returnUrl ? { returnUrl } : undefined,
  });
}

export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return loginTree(router, state.url);
};

/** Requires an existing Seller profile (active or suspended). */
export const sellerGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.hasSeller()) return true;
  if (auth.isLoggedIn() && !auth.hasSeller()) {
    return router.createUrlTree(['/seller/onboarding']);
  }
  return loginTree(router, state.url);
};

/** Logged-in user without a Seller profile (onboarding). */
export const noSellerGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return loginTree(router, state.url);
  if (auth.hasSeller()) return router.createUrlTree(['/seller']);
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isAdmin()) return true;
  return router.createUrlTree(['/']);
};
