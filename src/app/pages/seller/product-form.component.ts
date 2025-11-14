import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/products.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 class="text-xl font-semibold text-slate-900">Nuevo Producto</h2>
      <form (ngSubmit)="onSubmit()" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Nombre del Producto</label>
          <input [(ngModel)]="model.name" name="name" type="text" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Categoría</label>
          <select [(ngModel)]="model.category" name="category" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required>
            <option>Verduras</option>
            <option>Frutas</option>
            <option>Panadería</option>
            <option>Lácteos</option>
            <option>Artesanías</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Descripción</label>
          <textarea [(ngModel)]="model.description" name="description" rows="4" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required></textarea>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Precio</label>
          <input [(ngModel)]="model.price" name="price" type="number" min="0" step="0.01" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Unidad</label>
          <select [(ngModel)]="model.unit" name="unit" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required>
            <option>Kilogramo</option>
            <option>Unidad</option>
            <option>Frasco</option>
            <option>Litro</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-600 mb-1">Stock Disponible</label>
          <input [(ngModel)]="model.stock" name="stock" type="number" min="0" class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm text-slate-600 mb-1">Imagen</label>
          <input [(ngModel)]="model.image" name="image" type="url" placeholder="https://..." class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" required />
        </div>

        <div class="md:col-span-2 flex items-center gap-3 pt-2">
          <button type="submit" class="px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800">Publicar</button>
          <a routerLink="/seller" class="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50">Cancelar</a>
        </div>
      </form>
    </div>
  </main>
  `
})
export class ProductFormComponent {
  private productService = inject(ProductService);
  private router = inject(Router);

  model = {
    name: '',
    description: '',
    price: 0,
    unit: 'Kilogramo' as 'Kilogramo' | 'Unidad' | 'Frasco' | 'Litro',
    stock: 0,
    category: 'Verduras' as 'Verduras' | 'Frutas' | 'Panadería' | 'Lácteos' | 'Artesanías',
    image: '',
  };

  onSubmit() {
    const { name, description, price, unit, stock, category, image } = this.model;
    this.productService.create({ name, description, price: Number(price), unit, stock: Number(stock), category, image })
      .subscribe({
        next: () => this.router.navigateByUrl('/seller'),
        error: () => alert('Ocurrió un error al publicar el producto'),
      });
  }
}
