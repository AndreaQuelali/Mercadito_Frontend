import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { authGuard, sellerGuard, noSellerGuard, adminGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', component: LandingComponent },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products.component').then((m) => m.ProductsComponent),
  },
  { path: 'productos', redirectTo: 'products', pathMatch: 'full' },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
  },

  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },

  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },

  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent),
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
    canActivate: [authGuard],
  },

  {
    path: 'seller/onboarding',
    loadComponent: () =>
      import('./pages/seller/seller-onboarding.component').then(
        (m) => m.SellerOnboardingComponent
      ),
    canActivate: [authGuard, noSellerGuard],
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./layouts/seller-shell/seller-shell.component').then((m) => m.SellerShellComponent),
    canActivate: [authGuard, sellerGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/seller-home.component').then((m) => m.SellerHomeComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/seller/seller-dashboard.component').then(
            (m) => m.SellerDashboardComponent
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/seller/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'products/edit/:id',
        loadComponent: () =>
          import('./pages/seller/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/seller-orders/seller-orders.component').then(
            (m) => m.SellerOrdersComponent
          ),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./pages/dashboard/seller-placeholder.component').then(
            (m) => m.SellerPlaceholderComponent
          ),
        data: { title: 'Ventas' },
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/dashboard/seller-placeholder.component').then(
            (m) => m.SellerPlaceholderComponent
          ),
        data: { title: 'Inventario' },
      },
      {
        path: 'store',
        loadComponent: () =>
          import('./pages/seller/seller-settings.component').then(
            (m) => m.SellerSettingsComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dashboard/seller-placeholder.component').then(
            (m) => m.SellerPlaceholderComponent
          ),
        data: { title: 'Configuración' },
      },
    ],
  },

  { path: 'seller', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'seller/orders', redirectTo: 'dashboard/orders', pathMatch: 'full' },
  { path: 'seller/settings', redirectTo: 'dashboard/store', pathMatch: 'full' },
  { path: 'seller/new', redirectTo: 'dashboard/products/new', pathMatch: 'full' },
  { path: 'seller/edit/:id', redirectTo: 'dashboard/products/edit/:id' },

  {
    path: 'admin/sellers',
    loadComponent: () =>
      import('./pages/admin/admin-sellers.component').then((m) => m.AdminSellersComponent),
    canActivate: [authGuard, adminGuard],
  },

  { path: '**', redirectTo: '' },
];
