import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, ProductCategory, ProductUnit } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

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
  <main class="ui-page max-w-4xl">
    <p *ngIf="!auth.canManageStore()" class="ui-alert-warn mb-6">
      Tu puesto está suspendido. No puedes crear ni editar productos.
      <a routerLink="/dashboard/products" class="ui-link ml-1">Volver a productos</a>
    </p>

    <h1 class="ui-title mb-8">{{ isEdit ? 'Editar producto' : 'Nuevo producto' }}</h1>

    <div *ngIf="loading()" class="ui-skel h-64"></div>

    <form *ngIf="!loading() && auth.canManageStore()" (ngSubmit)="onSubmit()" class="ui-panel grid grid-cols-1 md:grid-cols-2 gap-5">
      <label class="block">
        <span class="ui-label">Nombre del producto</span>
        <input id="pf-name" [(ngModel)]="model.name" name="name" type="text" class="ui-field" required />
      </label>
      <label class="block">
        <span class="ui-label">Categoría</span>
        <select id="pf-category" [(ngModel)]="model.category" name="category" class="ui-field" required>
          <option *ngFor="let c of categories" [value]="c.value">{{ c.label }}</option>
        </select>
      </label>

      <label class="block md:col-span-2">
        <span class="ui-label">Descripción</span>
        <textarea id="pf-desc" [(ngModel)]="model.description" name="description" rows="4" class="ui-field" required></textarea>
      </label>

      <label class="block">
        <span class="ui-label">Precio (Bs)</span>
        <input id="pf-price" [(ngModel)]="model.price" name="price" type="number" min="0" step="0.01" class="ui-field" required />
      </label>
      <label class="block">
        <span class="ui-label">Unidad</span>
        <select id="pf-unit" [(ngModel)]="model.unit" name="unit" class="ui-field" required>
          <option *ngFor="let u of units" [value]="u.value">{{ u.label }}</option>
        </select>
      </label>

      <label class="block">
        <span class="ui-label">Stock disponible</span>
        <input id="pf-stock" [(ngModel)]="model.stock" name="stock" type="number" min="0" class="ui-field" required />
      </label>
      <label class="block">
        <span class="ui-label">URL de la imagen</span>
        <input id="pf-image" [(ngModel)]="model.image" name="image" type="url" placeholder="https://..." class="ui-field" required />
      </label>

      <p *ngIf="errorMsg()" class="md:col-span-2 ui-alert-error" role="alert">{{ errorMsg() }}</p>

      <div class="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
        <button id="pf-submit" type="submit" [disabled]="saving()" class="ui-btn">
          <span *ngIf="saving()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          {{ isEdit ? 'Guardar cambios' : 'Publicar' }}
        </button>
        <a routerLink="/dashboard/products" class="ui-btn ui-btn-ghost">Cancelar</a>
      </div>
    </form>
  </main>
  `
})
export class ProductFormComponent implements OnInit {
  private productService = inject(ProductService);
  private sellerSvc = inject(SellerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

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
    this.sellerSvc.getMine().subscribe({
      next: () => {
        if (!this.auth.canManageStore()) return;
        this.loadProductIfEdit();
      },
      error: () => this.loadProductIfEdit(),
    });
  }

  private loadProductIfEdit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
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

  onSubmit() {
    if (!this.auth.canManageStore()) return;
    const { name, description, price, unit, stock, category, image } = this.model;
    this.saving.set(true);
    this.errorMsg.set(null);

    const payload = { name, description, price: Number(price), unit, stock: Number(stock), category, image };

    const request = this.isEdit && this.editId
      ? this.productService.update(this.editId, payload)
      : this.productService.create(payload);

    request.subscribe({
      next: () => this.router.navigateByUrl('/dashboard/products'),
      error: () => {
        this.errorMsg.set('Ocurrió un error. Verifica los datos e intenta nuevamente.');
        this.saving.set(false);
      },
    });
  }
}
