import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductCard, ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';
import { PRODUCT_CATEGORIES } from '../products/products.component';

const SECTION_SIZE = 8;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
    <header class="space-y-2">
      <p class="text-sm text-text-muted">Mercado Boliviano</p>
      <h1 class="text-3xl sm:text-4xl font-display font-bold text-text-main">
        Hola{{ firstName() ? ', ' + firstName() : '' }}
      </h1>
      <p class="text-text-muted max-w-xl">
        Descubre puestos locales, encuentra lo fresco del día y vuelve a tus favoritos del barrio.
      </p>
    </header>

    <!-- Categories -->
    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-display font-semibold text-text-main">Categorías</h2>
        <a routerLink="/products" class="text-sm font-medium text-primary hover:underline">Ver catálogo</a>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          *ngFor="let c of browseCategories"
          [routerLink]="['/products']"
          [queryParams]="{ category: c.key }"
          class="px-4 py-2 rounded-full border border-border-medium bg-surface text-sm font-medium
                 text-text-muted hover:border-primary hover:text-primary transition"
        >
          {{ c.label }}
        </a>
      </div>
    </section>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-8">
      <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-xl shadow-card overflow-hidden">
          <div class="aspect-[4/3] skeleton"></div>
          <div class="p-4 space-y-3">
            <div class="skeleton h-4 w-2/3"></div>
            <div class="skeleton h-3 w-full"></div>
          </div>
        </div>
      </div>
    </div>

    <ng-container *ngIf="!loading()">
      <!-- Featured -->
      <section class="space-y-4">
        <div class="flex items-end justify-between gap-3">
          <div>
            <h2 class="text-xl font-display font-bold text-text-main">Destacados</h2>
            <p class="text-sm text-text-muted">Selección para empezar a explorar.</p>
          </div>
          <a routerLink="/products" class="text-sm font-medium text-primary hover:underline shrink-0">Ver todos</a>
        </div>
        <div *ngIf="featured().length === 0" class="text-sm text-text-subtle py-6">
          Aún no hay productos publicados.
        </div>
        <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <app-product-card *ngFor="let p of featured()" [product]="p" class="animate-fade-in" />
        </div>
      </section>

      <!-- Newest -->
      <section class="space-y-4">
        <div class="flex items-end justify-between gap-3">
          <div>
            <h2 class="text-xl font-display font-bold text-text-main">Recién llegados</h2>
            <p class="text-sm text-text-muted">Últimas publicaciones del mercado.</p>
          </div>
          <a routerLink="/products" class="text-sm font-medium text-primary hover:underline shrink-0">Ver todos</a>
        </div>
        <div *ngIf="newest().length === 0" class="text-sm text-text-subtle py-6">
          Aún no hay productos publicados.
        </div>
        <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <app-product-card *ngFor="let p of newest()" [product]="p" class="animate-fade-in" />
        </div>
      </section>

      <div class="flex justify-center pt-2 pb-6">
        <a
          routerLink="/products"
          class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover
                 text-white font-semibold shadow-theme-primary transition"
        >
          Ver todo el catálogo
        </a>
      </div>
    </ng-container>
  </main>
  `,
})
export class HomeComponent implements OnInit {
  private productService = inject(ProductService);
  private auth = inject(AuthService);

  browseCategories = PRODUCT_CATEGORIES.filter((c) => c.key !== 'all');
  products = signal<ProductCard[]>([]);
  loading = signal(true);

  firstName = computed(() => {
    const name = this.auth.currentUser()?.name?.trim() ?? '';
    return name.split(/\s+/)[0] || '';
  });

  featured = computed(() => this.products().slice(0, SECTION_SIZE));
  newest = computed(() => [...this.products()].reverse().slice(0, SECTION_SIZE));

  ngOnInit(): void {
    this.productService.list().subscribe({
      next: (items) => {
        this.products.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }
}
