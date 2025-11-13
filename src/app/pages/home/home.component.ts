import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCard, ProductCardComponent } from '../../components/product-card/product-card.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

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
  imports: [CommonModule, ProductCardComponent, MatChipsModule, MatIconModule, MatButtonModule],
  template: `
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <mat-chip-listbox class="flex flex-wrap gap-2" aria-label="Categorías">
      <mat-chip-option
        *ngFor="let c of categories"
        [selected]="activeCategory() === c.key"
        (click)="selectCategory(c.key)"
      >
        <mat-icon *ngIf="c.key==='all'" class="!text-base mr-1">category</mat-icon>
        {{ c.label }}
      </mat-chip-option>
    </mat-chip-listbox>

    <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <app-product-card
        *ngFor="let p of filtered()"
        [product]="p"
      />
    </section>
  </main>
  `
})
export class HomeComponent {
  @Input() query = '';

  categories = CATEGORIES;
  activeCategory = signal<string>('all');

  products = signal<ProductCard[]>([
    { id: 1, name: 'Tomates Frescos', description: 'Tomates orgánicos cultivados localmente, perfectos para ensaladas', price: 2.5, unit: 'kg', image: 'https://images.unsplash.com/photo-1546470427-ae4c07f17fd5?q=80&w=1470&auto=format&fit=crop', featured: true, seller: 'María González', location: 'Mercado Central, 2km' },
    { id: 2, name: 'Pan Artesanal', description: 'Pan de masa madre horneado esta mañana', price: 3, unit: 'unidad', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?q=80&w=1470&auto=format&fit=crop', featured: true, seller: 'Panadería El Sol', location: 'Barrio Norte, 1.3km' },
    { id: 3, name: 'Frutas Tropicales', description: 'Mix de frutas frescas: mango, piña y papaya', price: 4.5, unit: 'kg', image: 'https://images.unsplash.com/photo-1541984956-bc40f571d7d1?q=80&w=1470&auto=format&fit=crop', featured: true, seller: 'Frutas Don Pedro', location: 'Plaza Sur, 3km' },
  ]);

  filtered = computed(() => {
    const q = this.query.toLowerCase().trim();
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
}
