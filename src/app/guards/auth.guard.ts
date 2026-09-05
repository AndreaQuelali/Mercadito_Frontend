import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

/** Requires an existing Seller profile (active or suspended). */
export const sellerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.hasSeller()) return true;
  if (auth.isLoggedIn() && !auth.hasSeller()) {
    return router.createUrlTree(['/seller/onboarding']);
  }
  return router.createUrlTree(['/auth/login']);
};

/** Logged-in user without a Seller profile (onboarding). */
export const noSellerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  if (auth.hasSeller()) return router.createUrlTree(['/seller']);
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isAdmin()) return true;
  return router.createUrlTree(['/']);
};
