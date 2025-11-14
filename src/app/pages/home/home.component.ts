import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCard, ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/products.service';
import { SearchService } from '../../services/search.service';

const CATEGORIES = [
  { key: 'all', label: 'Todo' },
  { key: 'vegetables', label: 'Verduras' },
  { key: 'fruits', label: 'Frutas' },
  { key: 'bakery', label: 'Panadería' },
  { key: 'dairy', label: 'Lácteos' },
  { key: 'crafts', label: 'Artesanías' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <div class="flex flex-wrap gap-2">
      <button
        *ngFor="let c of categories"
        (click)="selectCategory(c.key)"
        class="px-3 py-1 rounded-full border text-sm"
        [class.bg-slate-900]="activeCategory() === c.key"
        [class.text-white]="activeCategory() === c.key"
        [class.border-slate-900]="activeCategory() === c.key"
      >
        {{ c.label }}
      </button>
    </div>

    <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <app-product-card
        *ngFor="let p of filtered()"
        [product]="p"
      />
    </section>
  </main>
  `
})
export class HomeComponent implements OnInit {
  private searchSvc = inject(SearchService);

  categories = CATEGORIES;
  activeCategory = signal<string>('all');

  products = signal<ProductCard[]>([]);
  private productService = inject(ProductService);

  filtered = computed(() => {
    const q = this.searchSvc.query().toLowerCase().trim();
    const cat = this.activeCategory();
    return this.products().filter(p => {
      const matchesQuery = q ? (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) : true;
      const matchesCategory = cat === 'all' ? true : this.belongsToCategory(p, cat);
      return matchesQuery && matchesCategory;
    });
  });

  selectCategory(key: string) {
    this.activeCategory.set(key);
  }

  private belongsToCategory(p: ProductCard, cat: string) {
    const map: Record<string, string[]> = {
      vegetables: ['tomate', 'zanahoria', 'lechuga', 'verdura'],
      fruits: ['fruta', 'mango', 'piña', 'papaya', 'banana'],
      bakery: ['pan', 'hogaza', 'artesanal'],
      dairy: ['leche', 'queso', 'yogurt'],
      crafts: ['artesanía', 'hecho a mano']
    };
    const tokens = (p.name + ' ' + p.description).toLowerCase();
    return (map[cat] || []).some(word => tokens.includes(word));
  }

  ngOnInit(): void {
    this.productService.list().subscribe({
      next: (items) => this.products.set(items),
      error: () => this.products.set([])
    });
  }
}
