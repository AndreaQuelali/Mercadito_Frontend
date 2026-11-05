import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductDto } from '../../services/products.service';
import { CartService } from '../../services/cart.service';
import { ReviewService, Review } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

const CATEGORY_LABELS: Record<string, string> = {
  verduras: 'Verduras', frutas: 'Frutas', panaderia: 'Panadería',
  lacteos: 'Lácteos', artesanias: 'Artesanías',
};
const UNIT_LABELS: Record<string, string> = {
  kilogramo: 'kg', unidad: 'unidad', frasco: 'frasco', litro: 'litro',
};

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <main class="ui-page">
    <a routerLink="/products" class="ui-link inline-flex items-center gap-2 mb-8">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">
        <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>
      </svg>
      Volver al catálogo
    </a>

    <div *ngIf="loading()" class="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div class="aspect-[4/3] ui-skel"></div>
      <div class="space-y-4 pt-4">
        <div class="ui-skel h-6 w-24"></div>
        <div class="ui-skel h-12 w-3/4"></div>
        <div class="ui-skel h-10 w-1/3"></div>
        <div class="ui-skel h-24"></div>
        <div class="ui-skel h-14 w-1/2"></div>
      </div>
    </div>

    <div *ngIf="product() && !loading()">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        <div class="aspect-[4/3] overflow-hidden bg-surface-subtle">
          <img [src]="product()!.image" [alt]="product()!.name" class="w-full h-full object-cover" />
        </div>

        <div class="flex flex-col gap-6 py-2">
          <div class="flex items-center gap-3">
            <span class="ui-tag">{{ categoryLabel(product()!.category) }}</span>
            <span class="text-text-muted">{{ unitLabel(product()!.unit) }}</span>
          </div>

          <h1 class="ui-title">{{ product()!.name }}</h1>

          <p class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-text-main">Bs {{ product()!.price | number:'1.2-2' }}</span>
            <span class="text-lg text-text-muted">/ {{ unitLabel(product()!.unit) }}</span>
          </p>

          <p class="text-lg leading-relaxed text-text-main max-w-[56ch]">{{ product()!.description }}</p>

          <p class="text-lg">
            <span class="font-semibold">Disponible:</span>
            <span [ngClass]="product()!.stock > 0 ? 'text-success font-semibold' : 'text-danger font-semibold'">
              {{ product()!.stock > 0 ? product()!.stock + ' unidades' : 'Sin stock' }}
            </span>
          </p>

          <div *ngIf="auth.isLoggedIn(); else authPrompt" class="flex flex-wrap items-center gap-3 mt-2">
            <div class="ui-qty" role="group" aria-label="Cantidad">
              <button type="button" (click)="decrementQty()" aria-label="Quitar una unidad">−</button>
              <output>{{ qty }}</output>
              <button type="button" (click)="incrementQty()" [disabled]="qty >= product()!.stock" aria-label="Agregar una unidad">+</button>
            </div>
            <button
              id="detail-add-to-cart"
              type="button"
              (click)="addToCart()"
              [disabled]="product()!.stock === 0 || addingToCart()"
              class="ui-btn flex-1 sm:flex-none"
            >
              <span *ngIf="addingToCart()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Agregar al carrito
            </button>
          </div>
          <ng-template #authPrompt>
            <p><a *ngIf="!auth.isLoggedIn()" routerLink="/auth/login" class="ui-btn">Inicia sesión para comprar</a></p>
          </ng-template>
        </div>
      </div>

      <section class="mt-16 max-w-3xl">
        <h2 class="ui-h2 mb-6">Reseñas ({{ reviews().length }})</h2>

        <div *ngIf="reviews().length > 0" class="space-y-3 mb-8">
          <article *ngFor="let r of reviews()" class="ui-panel">
            <div class="flex items-center justify-between gap-4 mb-2">
              <span class="font-semibold text-lg">{{ r.user.firstName }} {{ r.user.lastName }}</span>
              <div class="flex gap-0.5" [attr.aria-label]="r.rating + ' de 5 estrellas'">
                <svg *ngFor="let s of starsFor(r.rating)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-secondary" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/></svg>
                <svg *ngFor="let s of emptyStarsFor(r.rating)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-border-medium" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/></svg>
              </div>
            </div>
            <p class="text-text-main">{{ r.comment }}</p>
          </article>
        </div>
        <p *ngIf="reviews().length === 0 && !loadingReviews()" class="text-lg text-text-muted">
          Aún no hay reseñas para este producto.
        </p>
      </section>
    </div>
  </main>
  `
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productSvc = inject(ProductService);
  private cartSvc = inject(CartService);
  private reviewSvc = inject(ReviewService);
  private toastSvc = inject(ToastService);
  auth = inject(AuthService);

  product = signal<ProductDto | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  loadingReviews = signal(false);
  addingToCart = signal(false);
  qty = 1;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productSvc.getById(id).subscribe({
      next: (p) => { this.product.set(p); this.loading.set(false); this.loadReviews(id); },
      error: () => this.loading.set(false),
    });
  }

  loadReviews(id: number): void {
    this.loadingReviews.set(true);
    this.reviewSvc.listByProduct(id).subscribe({
      next: (r) => { this.reviews.set(r); this.loadingReviews.set(false); },
      error: () => this.loadingReviews.set(false),
    });
  }

  decrementQty(): void { if (this.qty > 1) this.qty--; }
  incrementQty(): void { const p = this.product(); if (p && this.qty < p.stock) this.qty++; }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.addingToCart.set(true);
    this.cartSvc.addItem(p.id, this.qty).subscribe({
      next: () => { this.toastSvc.success('Producto agregado al carrito'); this.addingToCart.set(false); },
      error: () => { this.toastSvc.error('No se pudo agregar al carrito'); this.addingToCart.set(false); },
    });
  }

  categoryLabel(cat: string) { return CATEGORY_LABELS[cat] ?? cat; }
  unitLabel(unit: string) { return UNIT_LABELS[unit] ?? unit; }
  starsFor(n: number): number[] { return Array(Math.max(0, Math.round(n))).fill(0); }
  emptyStarsFor(n: number): number[] { return Array(Math.max(0, 5 - Math.round(n))).fill(0); }
}
