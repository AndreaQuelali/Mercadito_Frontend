import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-slate-900 mb-6">Mi Carrito</h1>

    <!-- Empty state -->
    <div *ngIf="cart.items().length === 0 && !loading" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-10 w-10 text-slate-300">
          <path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/>
          <path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-slate-700 mb-2">Tu carrito está vacío</h2>
      <p class="text-slate-500 mb-6">Explora el catálogo y agrega productos.</p>
      <a routerLink="/" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 px-6 rounded-full transition">
        Explorar productos
      </a>
    </div>

    <!-- Loading skeleton -->
    <div *ngIf="loading" class="space-y-4 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="bg-white rounded-xl h-28 border border-slate-200"></div>
    </div>

    <!-- Cart items + summary -->
    <div *ngIf="cart.items().length > 0 && !loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Items list -->
      <div class="lg:col-span-2 space-y-3">
        <article *ngFor="let item of cart.items()"
          class="flex gap-4 bg-white rounded-xl border border-slate-200 p-4 items-center">
          <img [src]="item.product.image" [alt]="item.product.name"
               class="w-20 h-20 object-cover rounded-lg shrink-0" />
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-slate-900 truncate">{{ item.product.name }}</h3>
            <p class="text-sm text-slate-500 mt-0.5">\${{ item.product.price | number:'1.2-2' }} / {{ item.product.unit }}</p>
          </div>

          <!-- Quantity control -->
          <div class="flex items-center border border-slate-200 rounded-full overflow-hidden shrink-0">
            <button
              (click)="changeQty(item.id, item.quantity - 1)"
              class="px-3 py-1.5 hover:bg-slate-50 transition font-bold text-slate-700">−</button>
            <span class="px-3 py-1.5 text-slate-900 font-medium min-w-[2rem] text-center text-sm">{{ item.quantity }}</span>
            <button
              (click)="changeQty(item.id, item.quantity + 1)"
              [disabled]="item.quantity >= item.product.stock"
              class="px-3 py-1.5 hover:bg-slate-50 transition font-bold text-slate-700 disabled:opacity-30">+</button>
          </div>

          <div class="text-right shrink-0 min-w-[80px]">
            <div class="font-semibold text-slate-900">\${{ (item.quantity * item.product.price) | number:'1.2-2' }}</div>
            <button (click)="removeItem(item.id)" class="text-xs text-red-500 hover:text-red-700 mt-1 transition">Eliminar</button>
          </div>
        </article>
      </div>

      <!-- Order summary -->
      <aside class="lg:col-span-1">
        <div class="bg-white rounded-xl border border-slate-200 p-5 sticky top-24 space-y-4">
          <h2 class="font-bold text-slate-900 text-lg">Resumen</h2>
          <div class="space-y-2 text-sm">
            <div *ngFor="let item of cart.items()" class="flex justify-between text-slate-600">
              <span class="truncate max-w-[140px]">{{ item.product.name }} × {{ item.quantity }}</span>
              <span>\${{ (item.quantity * item.product.price) | number:'1.2-2' }}</span>
            </div>
          </div>
          <hr class="border-slate-100">
          <div class="flex justify-between font-bold text-slate-900 text-base">
            <span>Total</span>
            <span class="text-brand-600">\${{ cart.total() | number:'1.2-2' }}</span>
          </div>
          <a routerLink="/checkout"
             class="block w-full text-center bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-full transition">
            Proceder al pago
          </a>
          <a routerLink="/" class="block w-full text-center text-sm text-slate-500 hover:text-slate-800 transition py-1">
            Seguir comprando
          </a>
        </div>
      </aside>
    </div>
  </main>
  `
})
export class CartComponent implements OnInit {
  cart = inject(CartService);
  private toast = inject(ToastService);
  loading = true;

  ngOnInit(): void {
    this.cart.load().subscribe({
      next: () => this.loading = false,
      error: () => this.loading = false,
    });
  }

  changeQty(itemId: number, newQty: number): void {
    if (newQty <= 0) { this.removeItem(itemId); return; }
    this.cart.updateItem(itemId, newQty).subscribe({
      error: () => this.toast.error('No se pudo actualizar la cantidad'),
    });
  }

  removeItem(itemId: number): void {
    this.cart.removeItem(itemId).subscribe({
      error: () => this.toast.error('No se pudo eliminar el producto'),
    });
  }
}
