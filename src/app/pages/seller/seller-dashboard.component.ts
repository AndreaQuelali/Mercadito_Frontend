import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/products.service';
import { SellerProductCardComponent, SellerProduct } from '../../components/seller-product-card/seller-product-card.component';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SellerProductCardComponent],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <header class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Panel de Vendedor</h1>
        <p class="text-slate-500">Gestiona tus productos</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <a routerLink="/seller/settings"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-sm">
          Configuración
        </a>
        <a routerLink="/seller/orders"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-sm">
          Mis órdenes
        </a>
        <a *ngIf="auth.canManageStore()" routerLink="/seller/new"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
            <path fill-rule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z" clip-rule="evenodd"/>
          </svg>
          Nuevo Producto
        </a>
      </div>
    </header>

    <div *ngIf="!auth.canManageStore()"
         class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Tu puesto está suspendido. Puedes ver tus productos y órdenes, y editar la configuración del puesto, pero no crear ni modificar productos.
    </div>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-4 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="bg-white rounded-2xl h-32 border border-slate-200"></div>
    </div>

    <!-- Empty state -->
    <div *ngIf="!loading() && products().length === 0"
         class="flex flex-col items-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
      <p class="text-slate-600 font-medium mb-1">Aún no tienes productos</p>
      <p class="text-slate-400 text-sm mb-4">Publica tu primer producto y empieza a vender.</p>
      <a *ngIf="auth.canManageStore()" routerLink="/seller/new" class="inline-flex items-center gap-2 text-brand-600 font-medium hover:underline text-sm">
        + Agregar producto
      </a>
    </div>

    <!-- Products list -->
    <section *ngIf="!loading() && products().length > 0" class="space-y-4">
      <app-seller-product-card
        *ngFor="let p of products()"
        [product]="p"
        [canManage]="auth.canManageStore()"
        (remove)="onDelete($event)"
        (edit)="onEdit($event)"
      />
    </section>
  </main>
  `
})
export class SellerDashboardComponent implements OnInit {
  private productService = inject(ProductService);
  private sellerSvc = inject(SellerService);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  products = signal<SellerProduct[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({ error: () => undefined });
    this.fetch();
  }

  onDelete(id: number): void {
    if (!this.auth.canManageStore()) return;
    if (!confirm('¿Eliminar este producto?')) return;
    this.productService.delete(id).subscribe({
      next: () => { this.toast.success('Producto eliminado'); this.fetch(); },
      error: () => this.toast.error('No se pudo eliminar. Intenta nuevamente.'),
    });
  }

  onEdit(id: number): void {
    if (!this.auth.canManageStore()) return;
    this.router.navigateByUrl(`/seller/edit/${id}`);
  }

  private fetch(): void {
    this.loading.set(true);
    this.productService.listSeller().subscribe({
      next: (items) => { this.products.set(items as SellerProduct[]); this.loading.set(false); },
      error: () => { this.products.set([]); this.loading.set(false); },
    });
  }
}
