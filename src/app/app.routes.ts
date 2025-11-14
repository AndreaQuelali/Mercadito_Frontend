import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SellerDashboardComponent } from './pages/seller/seller-dashboard.component';
import { ProductFormComponent } from './pages/seller/product-form.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'seller', component: SellerDashboardComponent },
  { path: 'seller/new', component: ProductFormComponent },
  { path: '**', redirectTo: '' },
];
