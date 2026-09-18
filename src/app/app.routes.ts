import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ProductsComponent } from './pages/products/products.component';
import { LandingComponent } from './pages/landing/landing.component';
import { SellerDashboardComponent } from './pages/seller/seller-dashboard.component';
import { ProductFormComponent } from './pages/seller/product-form.component';
import { SellerOnboardingComponent } from './pages/seller/seller-onboarding.component';
import { SellerSettingsComponent } from './pages/seller/seller-settings.component';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { CartComponent } from './pages/cart/cart.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { SellerOrdersComponent } from './pages/seller-orders/seller-orders.component';
import { AdminSellersComponent } from './pages/admin/admin-sellers.component';
import { SellerShellComponent } from './layouts/seller-shell/seller-shell.component';
import { SellerHomeComponent } from './pages/dashboard/seller-home.component';
import { SellerPlaceholderComponent } from './pages/dashboard/seller-placeholder.component';
import { authGuard, sellerGuard, noSellerGuard, adminGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'productos', redirectTo: 'products', pathMatch: 'full' },
  { path: 'product/:id', component: ProductDetailComponent },

  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', component: ResetPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  { path: 'home', component: HomeComponent, canActivate: [authGuard] },

  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },

  {
    path: 'seller/onboarding',
    component: SellerOnboardingComponent,
    canActivate: [authGuard, noSellerGuard],
  },

  {
    path: 'dashboard',
    component: SellerShellComponent,
    canActivate: [authGuard, sellerGuard],
    children: [
      { path: '', component: SellerHomeComponent },
      { path: 'products', component: SellerDashboardComponent },
      { path: 'products/new', component: ProductFormComponent },
      { path: 'products/edit/:id', component: ProductFormComponent },
      { path: 'orders', component: SellerOrdersComponent },
      { path: 'sales', component: SellerPlaceholderComponent, data: { title: 'Ventas' } },
      { path: 'inventory', component: SellerPlaceholderComponent, data: { title: 'Inventario' } },
      { path: 'store', component: SellerSettingsComponent },
      { path: 'settings', component: SellerPlaceholderComponent, data: { title: 'Configuración' } },
    ],
  },

  { path: 'seller', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'seller/orders', redirectTo: 'dashboard/orders', pathMatch: 'full' },
  { path: 'seller/settings', redirectTo: 'dashboard/store', pathMatch: 'full' },
  { path: 'seller/new', redirectTo: 'dashboard/products/new', pathMatch: 'full' },
  { path: 'seller/edit/:id', redirectTo: 'dashboard/products/edit/:id' },

  {
    path: 'admin/sellers',
    component: AdminSellersComponent,
    canActivate: [authGuard, adminGuard],
  },

  { path: '**', redirectTo: '' },
];
