import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCard, ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/products.service';
import { SearchService } from '../../services/search.service';

const CATEGORIES = [
  { key: 'all',        label: 'Todo' },
  { key: 'verduras',   label: 'Verduras' },
  { key: 'frutas',     label: 'Frutas' },
  { key: 'panaderia',  label: 'Panadería' },
  { key: 'lacteos',    label: 'Lácteos' },
  { key: 'artesanias', label: 'Artesanías' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- Category chips -->
    <div class="flex flex-wrap gap-2">
      <button
        *ngFor="let c of categories"
        (click)="selectCategory(c.key)"
        class="px-4 py-1.5 rounded-full border text-sm font-medium transition-all"
        [ngClass]="activeCategory() === c.key
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:text-slate-900'"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- Loading skeleton grid -->
    <section *ngIf="loading()" class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div *ngFor="let i of [1,2,3,4,5,6,7,8]"
           class="bg-white rounded-xl shadow-card overflow-hidden">
        <div class="aspect-[4/3] skeleton"></div>
        <div class="p-4 space-y-3">
          <div class="skeleton h-4 w-2/3"></div>
          <div class="skeleton h-3 w-full"></div>
          <div class="skeleton h-3 w-4/5"></div>
          <div class="flex justify-between items-center pt-1">
            <div class="skeleton h-5 w-20"></div>
            <div class="skeleton h-8 w-24 rounded-full"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Products grid -->
    <section *ngIf="!loading()" class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <app-product-card
        *ngFor="let p of filtered()"
        [product]="p"
        class="animate-fade-in"
      />
    </section>

    <!-- Empty state -->
    <div *ngIf="!loading() && filtered().length === 0"
         class="flex flex-col items-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-8 w-8 text-warm-400">
          <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.235 12.03l3.743 3.742a.75.75 0 1 0 1.06-1.06l-3.742-3.743A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clip-rule="evenodd"/>
        </svg>
      </div>
      <p class="text-slate-600 font-medium">No se encontraron productos</p>
      <p class="text-slate-400 text-sm mt-1">Prueba con otro término o categoría.</p>
    </div>
  </main>
  `
})
export class HomeComponent implements OnInit {
  private searchSvc = inject(SearchService);
  private productService = inject(ProductService);

  categories = CATEGORIES;
  activeCategory = signal<string>('all');
  products = signal<ProductCard[]>([]);
  loading = signal(true);

  filtered = computed(() => {
    const q = this.searchSvc.query().toLowerCase().trim();
    const cat = this.activeCategory();
    return this.products().filter(p => {
      const matchesQuery = q
        ? (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
        : true;
      const matchesCategory = cat === 'all'
        ? true
        : (p as any).category === cat;
      return matchesQuery && matchesCategory;
    });
  });

  selectCategory(key: string): void {
    this.activeCategory.set(key);
  }

  ngOnInit(): void {
    this.productService.list().subscribe({
      next: (items) => { this.products.set(items); this.loading.set(false); },
      error: () => { this.products.set([]); this.loading.set(false); },
    });
  }
}
