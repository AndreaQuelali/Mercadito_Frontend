import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

export type ProductCard = {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock?: number;
  category?: string;
  image: string;
  featured?: boolean;
  seller?: string;
  location?: string;
};

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <article class="bg-white rounded-xl shadow-card overflow-hidden flex flex-col product-card-hover group cursor-pointer"
           [routerLink]="['/product', product?.id]">
    <div class="aspect-[4/3] overflow-hidden bg-slate-100">
      <img [src]="product?.image" [alt]="product?.name"
           class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
    </div>
    <div class="p-4 flex flex-col gap-2 flex-1">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-slate-900 font-semibold line-clamp-1">{{ product?.name }}</h3>
        <span *ngIf="product?.featured"
              class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">Destacado</span>
      </div>
      <p class="text-sm text-slate-500 line-clamp-2 flex-1">{{ product?.description }}</p>

      <div *ngIf="product?.seller" class="text-xs text-slate-400">
        Vendedor: {{ product?.seller }}
      </div>

      <div class="flex items-center justify-between pt-2 mt-auto">
        <div>
          <div class="text-brand-600 font-bold text-lg">\${{ product?.price | number:'1.2-2' }}</div>
          <div class="text-xs text-slate-400">por {{ product?.unit }}</div>
        </div>
        <button
          (click)="addToCart($event)"
          [disabled]="(product?.stock ?? 1) === 0 || adding()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition text-sm font-medium disabled:opacity-40"
        >
          <span *ngIf="adding()" class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <svg *ngIf="!adding()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z" clip-rule="evenodd"/>
          </svg>
          Agregar
        </button>
      </div>
    </div>
  </article>
  `
})
export class ProductCardComponent {
  @Input() product?: ProductCard;
  private cartSvc = inject(CartService);
  private authSvc = inject(AuthService);
  private toastSvc = inject(ToastService);
  adding = signal(false);

  addToCart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.product) return;
    if (!this.authSvc.isLoggedIn()) {
      this.toastSvc.info('Inicia sesión para agregar al carrito');
      return;
    }
    this.adding.set(true);
    this.cartSvc.addItem(this.product.id, 1).subscribe({
      next: () => { this.toastSvc.success('Agregado al carrito'); this.adding.set(false); },
      error: () => { this.toastSvc.error('No se pudo agregar'); this.adding.set(false); },
    });
  }
}
