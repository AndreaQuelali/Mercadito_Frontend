import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductCard, ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/products.service';
import { SearchService } from '../../services/search.service';

export const PRODUCT_CATEGORIES = [
  { key: 'all', label: 'Todo' },
  { key: 'verduras', label: 'Verduras' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'panaderia', label: 'Panadería' },
  { key: 'lacteos', label: 'Lácteos' },
  { key: 'artesanias', label: 'Artesanías' },
];

const VALID_CATEGORIES = new Set(
  PRODUCT_CATEGORIES.map((c) => c.key).filter((k) => k !== 'all')
);

export type ProductSort = 'name_asc' | 'price_asc' | 'price_desc';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, FormsModule, ProductCardComponent],
  template: `
  <main class="ui-page space-y-8">
    <header class="space-y-3">
      <h1 class="ui-title">Catálogo</h1>
      <p class="ui-lead">Busca, filtra y ordena lo que hay hoy en los puestos del mercado.</p>
    </header>

    <div class="ui-panel space-y-5">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Rubros">
        <button
          *ngFor="let c of categories"
          type="button"
          (click)="selectCategory(c.key)"
          class="ui-chip on-panel"
          [class.is-active]="activeCategory() === c.key"
          [attr.aria-pressed]="activeCategory() === c.key"
        >
          {{ c.label }}
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block">
          <span class="ui-label">Buscar</span>
          <input
            id="catalog-search"
            type="search"
            class="ui-field"
            placeholder="Nombre o descripción"
            [ngModel]="localQuery()"
            (ngModelChange)="onQueryChange($event)"
          />
        </label>
        <label class="block">
          <span class="ui-label">Precio mín. (Bs)</span>
          <input
            id="catalog-min"
            type="number"
            min="0"
            class="ui-field"
            placeholder="0"
            [ngModel]="minPrice()"
            (ngModelChange)="onMinPriceChange($event)"
          />
        </label>
        <label class="block">
          <span class="ui-label">Precio máx. (Bs)</span>
          <input
            id="catalog-max"
            type="number"
            min="0"
            class="ui-field"
            placeholder="Sin límite"
            [ngModel]="maxPrice()"
            (ngModelChange)="onMaxPriceChange($event)"
          />
        </label>
        <label class="block">
          <span class="ui-label">Ordenar</span>
          <select
            id="catalog-sort"
            class="ui-field"
            [ngModel]="sort()"
            (ngModelChange)="onSortChange($event)"
          >
            <option value="name_asc">Nombre A–Z</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
        </label>
      </div>
    </div>

    <section *ngIf="loading()" class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div *ngFor="let i of [1,2,3,4,5,6,7,8]" class="ui-panel !p-0">
        <div class="aspect-[4/3] ui-skel"></div>
        <div class="p-4 space-y-3">
          <div class="ui-skel h-5 w-2/3"></div>
          <div class="ui-skel h-4 w-full"></div>
          <div class="ui-skel h-4 w-4/5"></div>
        </div>
      </div>
    </section>

    <section *ngIf="!loading()" class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <app-product-card *ngFor="let p of filtered()" [product]="p" class="animate-fade-in" />
    </section>

    <ui-empty *ngIf="!loading() && filtered().length === 0" variant="no-results" title="No se encontraron productos" text="Prueba con otro término, otro rubro o un rango de precio distinto.">
      <button type="button" class="ui-btn ui-btn-ghost" (click)="clearFilters()">Limpiar filtros</button>
    </ui-empty>
  </main>
  `,
})
export class ProductsComponent implements OnInit {
  private searchSvc = inject(SearchService);
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  categories = PRODUCT_CATEGORIES;
  activeCategory = signal<string>('all');
  products = signal<ProductCard[]>([]);
  loading = signal(true);
  localQuery = signal('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  sort = signal<ProductSort>('name_asc');

  filtered = computed(() => {
    const q = this.localQuery().toLowerCase().trim();
    const cat = this.activeCategory();
    const min = this.minPrice();
    const max = this.maxPrice();
    const sort = this.sort();

    let list = this.products().filter((p) => {
      const matchesQuery = q
        ? p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
        : true;
      const matchesCategory = cat === 'all' ? true : p.category === cat;
      const matchesMin = min == null || Number.isNaN(min) ? true : p.price >= min;
      const matchesMax = max == null || Number.isNaN(max) ? true : p.price <= max;
      return matchesQuery && matchesCategory && matchesMin && matchesMax;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return a.name.localeCompare(b.name, 'es');
    });

    return list;
  });

  ngOnInit(): void {
    this.applyParams(this.route.snapshot.queryParamMap);

    this.route.queryParamMap.subscribe((params) => {
      this.applyParams(params);
    });

    // Sync header SearchService → local query when already on /products
    const headerQ = this.searchSvc.query();
    if (headerQ && !this.localQuery()) {
      this.localQuery.set(headerQ);
    }

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

  clearFilters(): void {
    this.activeCategory.set('all');
    this.localQuery.set('');
    this.searchSvc.setQuery('');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.syncQueryParams();
  }

  selectCategory(key: string): void {
    this.activeCategory.set(key);
    this.syncQueryParams();
  }

  onQueryChange(value: string): void {
    this.localQuery.set(value ?? '');
    this.searchSvc.setQuery(this.localQuery());
    this.syncQueryParams();
  }

  onMinPriceChange(value: string | number | null): void {
    const n = value === '' || value == null ? null : Number(value);
    this.minPrice.set(n != null && !Number.isNaN(n) ? n : null);
    this.syncQueryParams();
  }

  onMaxPriceChange(value: string | number | null): void {
    const n = value === '' || value == null ? null : Number(value);
    this.maxPrice.set(n != null && !Number.isNaN(n) ? n : null);
    this.syncQueryParams();
  }

  onSortChange(value: ProductSort): void {
    this.sort.set(value);
    this.syncQueryParams();
  }

  private applyParams(params: { get(name: string): string | null }): void {
    const cat = params.get('category');
    if (cat && VALID_CATEGORIES.has(cat)) {
      this.activeCategory.set(cat);
    } else if (!cat) {
      this.activeCategory.set('all');
    }

    const q = params.get('q');
    if (q != null) {
      this.localQuery.set(q);
      this.searchSvc.setQuery(q);
    }

    const min = params.get('minPrice');
    const max = params.get('maxPrice');
    this.minPrice.set(min != null && min !== '' ? Number(min) : null);
    this.maxPrice.set(max != null && max !== '' ? Number(max) : null);

    const sort = params.get('sort') as ProductSort | null;
    if (sort === 'name_asc' || sort === 'price_asc' || sort === 'price_desc') {
      this.sort.set(sort);
    }
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      category: this.activeCategory() === 'all' ? null : this.activeCategory(),
      q: this.localQuery().trim() || null,
      minPrice: this.minPrice() != null ? String(this.minPrice()) : null,
      maxPrice: this.maxPrice() != null ? String(this.maxPrice()) : null,
      sort: this.sort() === 'name_asc' ? null : this.sort(),
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
