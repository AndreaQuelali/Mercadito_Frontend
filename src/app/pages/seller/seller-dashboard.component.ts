import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/products.service';
import { SellerProductCardComponent, SellerProduct } from '../../components/seller-product-card/seller-product-card.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SellerProductCardComponent],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Panel de Vendedor</h1>
        <p class="text-slate-500">Gestiona tus productos</p>
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/seller/orders"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd"/>
            <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Z" clip-rule="evenodd"/>
          </svg>
          Mis órdenes
        </a>
        <a routerLink="/seller/new"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
            <path fill-rule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z" clip-rule="evenodd"/>
          </svg>
          Nuevo Producto
        </a>
      </div>
    </header>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-4 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="bg-white rounded-2xl h-32 border border-slate-200"></div>
    </div>

    <!-- Empty state -->
    <div *ngIf="!loading() && products().length === 0"
         class="flex flex-col items-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
      <div class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7 text-slate-300">
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
        </svg>
      </div>
      <p class="text-slate-600 font-medium mb-1">Aún no tienes productos</p>
      <p class="text-slate-400 text-sm mb-4">Publica tu primer producto y empieza a vender.</p>
      <a routerLink="/seller/new" class="inline-flex items-center gap-2 text-brand-600 font-medium hover:underline text-sm">
        + Agregar producto
      </a>
    </div>

    <!-- Products list -->
    <section *ngIf="!loading() && products().length > 0" class="space-y-4">
      <app-seller-product-card
        *ngFor="let p of products()"
        [product]="p"
        (remove)="onDelete($event)"
        (edit)="onEdit($event)"
      />
    </section>
  </main>
  `
})
export class SellerDashboardComponent implements OnInit {
  private productService = inject(ProductService);
  private router = inject(Router);
  private toast = inject(ToastService);
  products = signal<SellerProduct[]>([]);
  loading = signal(true);

  ngOnInit(): void { this.fetch(); }

  onDelete(id: number): void {
    if (!confirm('¿Eliminar este producto?')) return;
    this.productService.delete(id).subscribe({
      next: () => { this.toast.success('Producto eliminado'); this.fetch(); },
      error: () => this.toast.error('No se pudo eliminar. Intenta nuevamente.'),
    });
  }

  onEdit(id: number): void {
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
