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
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Back -->
    <a routerLink="/" class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
        <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>
      </svg>
      Volver al catálogo
    </a>

    <!-- Skeleton -->
    <div *ngIf="loading()" class="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse">
      <div class="aspect-[4/3] rounded-2xl bg-slate-200"></div>
      <div class="space-y-4 pt-4">
        <div class="h-6 bg-slate-200 rounded w-24"></div>
        <div class="h-10 bg-slate-200 rounded w-3/4"></div>
        <div class="h-8 bg-slate-200 rounded w-1/3"></div>
        <div class="h-20 bg-slate-200 rounded"></div>
        <div class="h-12 bg-slate-200 rounded-full w-1/2"></div>
      </div>
    </div>

    <!-- Product -->
    <div *ngIf="product() && !loading()">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">

        <!-- Image -->
        <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
          <img [src]="product()!.image" [alt]="product()!.name"
               class="w-full h-full object-cover" />
        </div>

        <!-- Info -->
        <div class="flex flex-col gap-5 py-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
              {{ categoryLabel(product()!.category) }}
            </span>
            <span class="text-xs text-slate-400">{{ unitLabel(product()!.unit) }}</span>
          </div>

          <h1 class="text-3xl font-bold text-slate-900 leading-tight">{{ product()!.name }}</h1>

          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold text-brand-600">\${{ product()!.price | number:'1.2-2' }}</span>
            <span class="text-slate-500">/ {{ unitLabel(product()!.unit) }}</span>
          </div>

          <p class="text-slate-600 leading-relaxed">{{ product()!.description }}</p>

          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium text-slate-700">Stock disponible:</span>
            <span [ngClass]="product()!.stock > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'">
              {{ product()!.stock > 0 ? product()!.stock + ' unidades' : 'Sin stock' }}
            </span>
          </div>

          <!-- Add to cart -->
          <div *ngIf="auth.isLoggedIn() && !auth.isSeller(); else authPrompt" class="flex items-center gap-3 mt-2">
            <div class="flex items-center border border-slate-300 rounded-full overflow-hidden">
              <button (click)="decrementQty()" class="px-3 py-2 hover:bg-slate-50 transition font-bold text-lg leading-none">−</button>
              <span class="px-4 py-2 text-slate-900 font-semibold min-w-[3rem] text-center">{{ qty }}</span>
              <button (click)="incrementQty()" [disabled]="qty >= product()!.stock" class="px-3 py-2 hover:bg-slate-50 transition font-bold text-lg leading-none disabled:opacity-30">+</button>
            </div>
            <button
              (click)="addToCart()"
              [disabled]="product()!.stock === 0 || addingToCart()"
              class="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-full transition disabled:opacity-50"
            >
              <span *ngIf="addingToCart()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <svg *ngIf="!addingToCart()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                <path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/>
                <path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
              </svg>
              Agregar al carrito
            </button>
          </div>
          <ng-template #authPrompt>
            <a *ngIf="!auth.isLoggedIn()" routerLink="/auth/login"
               class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-full transition">
              Inicia sesión para comprar
            </a>
          </ng-template>
        </div>
      </div>

      <!-- Reviews -->
      <section class="mt-14">
        <h2 class="text-xl font-bold text-slate-900 mb-6">Reseñas ({{ reviews().length }})</h2>

        <!-- Review list -->
        <div *ngIf="reviews().length > 0" class="space-y-4 mb-8">
          <article *ngFor="let r of reviews()"
            class="bg-white rounded-xl border border-slate-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-slate-900">{{ r.user.firstName }} {{ r.user.lastName }}</span>
              <div class="flex gap-0.5">
                <svg *ngFor="let s of starsFor(r.rating)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     fill="currentColor" class="h-4 w-4 text-amber-400">
                  <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/>
                </svg>
                <svg *ngFor="let s of emptyStarsFor(r.rating)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     fill="currentColor" class="h-4 w-4 text-slate-200">
                  <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
            <p class="text-slate-600 text-sm">{{ r.comment }}</p>
          </article>
        </div>
        <div *ngIf="reviews().length === 0 && !loadingReviews()" class="text-slate-400 text-sm mb-8">
          Aún no hay reseñas para este producto.
        </div>
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
