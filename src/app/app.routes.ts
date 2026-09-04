import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SellerDashboardComponent } from './pages/seller/seller-dashboard.component';
import { ProductFormComponent } from './pages/seller/product-form.component';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { CartComponent } from './pages/cart/cart.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { SellerOrdersComponent } from './pages/seller-orders/seller-orders.component';
import { authGuard, sellerGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  // Public
  { path: '', component: HomeComponent },
  { path: 'product/:id', component: ProductDetailComponent },

  // Auth
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },

  // Buyer (requires auth)
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },

  // Seller (requires auth + seller role)
  { path: 'seller', component: SellerDashboardComponent, canActivate: [authGuard, sellerGuard] },
  { path: 'seller/new', component: ProductFormComponent, canActivate: [authGuard, sellerGuard] },
  { path: 'seller/edit/:id', component: ProductFormComponent, canActivate: [authGuard, sellerGuard] },
  { path: 'seller/orders', component: SellerOrdersComponent, canActivate: [authGuard, sellerGuard] },

  // Catch-all
  { path: '**', redirectTo: '' },
];
