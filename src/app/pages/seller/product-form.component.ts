import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, ProductCategory, ProductUnit } from '../../services/products.service';

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'verduras', label: 'Verduras' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'panaderia', label: 'Panadería' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'artesanias', label: 'Artesanías' },
];

const UNIT_OPTIONS: { value: ProductUnit; label: string }[] = [
  { value: 'kilogramo', label: 'Kilogramo' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'litro', label: 'Litro' },
];

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 class="text-xl font-semibold text-slate-900">{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</h2>

      <div *ngIf="loading()" class="mt-8 flex justify-center">
        <div class="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <form *ngIf="!loading()" (ngSubmit)="onSubmit()" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Nombre del Producto</label>
          <input [(ngModel)]="model.name" name="name" type="text"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Categoría</label>
          <select [(ngModel)]="model.category" name="category"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required>
            <option *ngFor="let c of categories" [value]="c.value">{{ c.label }}</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Descripción</label>
          <textarea [(ngModel)]="model.description" name="description" rows="4"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required></textarea>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Precio</label>
          <input [(ngModel)]="model.price" name="price" type="number" min="0" step="0.01"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Unidad</label>
          <select [(ngModel)]="model.unit" name="unit"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required>
            <option *ngFor="let u of units" [value]="u.value">{{ u.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Stock Disponible</label>
          <input [(ngModel)]="model.stock" name="stock" type="number" min="0"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">URL de Imagen</label>
          <input [(ngModel)]="model.image" name="image" type="url" placeholder="https://..."
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>

        <div *ngIf="errorMsg()" class="md:col-span-2 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">
          {{ errorMsg() }}
        </div>

        <div class="md:col-span-2 flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="saving()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
            <span *ngIf="saving()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ isEdit ? 'Guardar Cambios' : 'Publicar' }}
          </button>
          <a routerLink="/seller" class="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50">Cancelar</a>
        </div>
      </form>
    </div>
  </main>
  `
})
export class ProductFormComponent implements OnInit {
  private productService = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  categories = CATEGORY_OPTIONS;
  units = UNIT_OPTIONS;

  isEdit = false;
  editId: number | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  model = {
    name: '',
    description: '',
    price: 0,
    unit: 'kilogramo' as ProductUnit,
    stock: 0,
    category: 'verduras' as ProductCategory,
    image: '',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editId = Number(id);
      this.loading.set(true);
      this.productService.getById(this.editId).subscribe({
        next: (p) => {
          this.model = {
            name: p.name,
            description: p.description,
            price: p.price,
            unit: p.unit,
            stock: p.stock,
            category: p.category,
            image: p.image,
          };
          this.loading.set(false);
        },
        error: () => {
          this.errorMsg.set('No se pudo cargar el producto.');
          this.loading.set(false);
        }
      });
    }
  }

  onSubmit() {
    const { name, description, price, unit, stock, category, image } = this.model;
    this.saving.set(true);
    this.errorMsg.set(null);

    const payload = { name, description, price: Number(price), unit, stock: Number(stock), category, image };

    const request = this.isEdit && this.editId
      ? this.productService.update(this.editId, payload)
      : this.productService.create(payload);

    request.subscribe({
      next: () => this.router.navigateByUrl('/seller'),
      error: () => {
        this.errorMsg.set('Ocurrió un error. Verifica los datos e intenta nuevamente.');
        this.saving.set(false);
      },
    });
  }
}
