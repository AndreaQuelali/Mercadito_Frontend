import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SellerProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  stock?: number;
  category?: string;
  featured?: boolean;
  location?: string;
};

@Component({
  selector: 'app-seller-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
  <article class="ui-panel flex flex-col sm:flex-row gap-5 items-start">
    <img [src]="product?.image" [alt]="product?.name" class="w-full sm:w-36 h-36 object-cover shrink-0" />
    <div class="flex-1 space-y-2 min-w-0">
      <div class="flex items-center gap-3 flex-wrap">
        <h3 class="font-display text-2xl font-bold leading-tight">{{ product?.name }}</h3>
        <span *ngIf="product?.featured" class="ui-tag" style="background: var(--color-secondary); color: var(--color-text-on-secondary)">Destacado</span>
      </div>
      <p class="text-text-muted">{{ product?.description }}</p>

      <dl class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div>
          <dt class="text-sm text-text-muted">Precio</dt>
          <dd class="font-bold">Bs {{ product?.price | number:'1.2-2' }} / {{ product?.unit }}</dd>
        </div>
        <div>
          <dt class="text-sm text-text-muted">Stock</dt>
          <dd class="font-semibold">{{ product?.stock ?? '-' }} unidades</dd>
        </div>
        <div>
          <dt class="text-sm text-text-muted">Categoría</dt>
          <dd class="font-semibold capitalize">{{ product?.category ?? '-' }}</dd>
        </div>
        <div>
          <dt class="text-sm text-text-muted">Ubicación</dt>
          <dd class="font-semibold">{{ product?.location ?? '—' }}</dd>
        </div>
      </dl>

      <div *ngIf="canManage" class="flex items-center gap-2 pt-3">
        <button type="button" (click)="edit.emit(product?.id!)" class="ui-btn ui-btn-ghost ui-btn-sm">Editar</button>
        <button type="button" (click)="remove.emit(product?.id!)" class="ui-btn ui-btn-danger ui-btn-sm">Eliminar</button>
      </div>
    </div>
  </article>
  `
})
export class SellerProductCardComponent {
  @Input() product?: SellerProduct;
  @Input() canManage = true;
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();
}
