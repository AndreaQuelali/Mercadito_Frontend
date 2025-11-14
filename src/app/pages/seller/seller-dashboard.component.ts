import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/products.service';
import { ProductCard } from '../../components/product-card/product-card.component';
import { SellerProductCardComponent, SellerProduct } from '../../components/seller-product-card/seller-product-card.component';

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
      <a routerLink="/seller/new" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path fill-rule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z" clip-rule="evenodd"/></svg>
        Nuevo Producto
      </a>
    </header>

    <section class="space-y-4">
      <app-seller-product-card
        *ngFor="let p of products()"
        [product]="p"
        (remove)="onDelete($event)"
        (edit)="onEdit($event)"
      />
      <div *ngIf="products().length === 0" class="text-slate-500">Aún no tienes productos.</div>
    </section>
  </main>
  `
})
export class SellerDashboardComponent implements OnInit {
  private productService = inject(ProductService);
  products = signal<(ProductCard & SellerProduct)[]>([]);

  ngOnInit(): void {
    this.fetch();
  }

  onDelete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;
    this.productService.delete(id).subscribe({
      next: () => this.fetch(),
      error: () => alert('No se pudo eliminar. Intenta nuevamente.'),
    });
  }

  onEdit(id: number) {
    // TODO: ruta de edición cuando esté implementada
  }

  private fetch() {
    this.productService.listSeller().subscribe({
      next: (items) => this.products.set(items as any),
      error: () => this.products.set([]),
    });
  }
}
