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
  <main class="ui-page space-y-16">
    <section class="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div class="space-y-6">
        <h1 class="ui-title">Hola{{ firstName() ? ', ' + firstName() : '' }}</h1>
        <p class="ui-lead">
          Descubre los puestos de tu barrio, encuentra lo fresco del día y vuelve a tus favoritos.
        </p>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Rubros">
          <a
            *ngFor="let c of browseCategories"
            [routerLink]="['/products']"
            [queryParams]="{ category: c.key }"
            class="ui-chip"
          >
            {{ c.label }}
          </a>
        </div>
        <p><a routerLink="/products" class="ui-btn">Ver el catálogo</a></p>
      </div>
      <figure class="m-0">
        <img
          src="assets/landing/interior-cliza.jpg"
          alt="Interior del mercado de Cliza, Cochabamba"
          class="w-full aspect-[3/2] object-cover"
          width="1500"
          height="1000"
        />
      </figure>
    </section>

    <div *ngIf="loading()" class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div *ngFor="let i of [1,2,3,4]" class="ui-panel !p-0">
        <div class="aspect-[4/3] ui-skel"></div>
        <div class="p-4 space-y-3">
          <div class="ui-skel h-5 w-2/3"></div>
          <div class="ui-skel h-4 w-full"></div>
        </div>
      </div>
    </div>

    <ng-container *ngIf="!loading()">
      <section class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="ui-h2">Destacados</h2>
            <p class="text-lg text-text-muted mt-1">Una selección para empezar.</p>
          </div>
          <a routerLink="/products" class="ui-link shrink-0">Ver todos</a>
        </div>
        <p *ngIf="featured().length === 0" class="text-lg text-text-muted">Aún no hay productos publicados.</p>
        <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <app-product-card *ngFor="let p of featured()" [product]="p" class="animate-fade-in" />
        </div>
      </section>

      <section class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="ui-h2">Recién llegados</h2>
            <p class="text-lg text-text-muted mt-1">Lo último que publicaron los puestos.</p>
          </div>
          <a routerLink="/products" class="ui-link shrink-0">Ver todos</a>
        </div>
        <p *ngIf="newest().length === 0" class="text-lg text-text-muted">Aún no hay productos publicados.</p>
        <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <app-product-card *ngFor="let p of newest()" [product]="p" class="animate-fade-in" />
        </div>
      </section>
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
