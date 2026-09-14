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
  styleUrls: ['./product-card.component.css'],
  template: `
  <article class="pcard" [routerLink]="['/product', product?.id]">
    <div class="pcard__media">
      <img [src]="product?.image" [alt]="product?.name || 'Producto'" loading="lazy" />
      <span *ngIf="product?.category" class="pcard__badge">{{ product?.category }}</span>
      <span *ngIf="product?.featured" class="pcard__featured">Destacado</span>
    </div>
    <div class="pcard__body">
      <h3 class="pcard__title font-display">{{ product?.name }}</h3>
      <p class="pcard__desc">{{ product?.description }}</p>
      <p *ngIf="product?.seller" class="pcard__seller">{{ product?.seller }}</p>

      <div class="pcard__footer">
        <div>
          <div class="pcard__price font-mono">Bs {{ product?.price | number:'1.2-2' }}</div>
          <div class="pcard__unit">por {{ product?.unit }}</div>
        </div>
        <button
          type="button"
          class="pcard__add"
          (click)="addToCart($event)"
          [disabled]="(product?.stock ?? 1) === 0 || adding()"
          [attr.aria-label]="'Agregar ' + (product?.name || 'producto') + ' al carrito'"
        >
          <span *ngIf="adding()" class="pcard__spin" aria-hidden="true"></span>
          <span *ngIf="!adding()" aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  </article>
  `,
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
      next: () => {
        this.toastSvc.success('Agregado al carrito');
        this.adding.set(false);
      },
      error: () => {
        this.toastSvc.error('No se pudo agregar');
        this.adding.set(false);
      },
    });
  }
}
