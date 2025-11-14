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
  <article class="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 items-start">
    <img [src]="product?.image" [alt]="product?.name" class="w-28 h-28 object-cover rounded-lg" />
    <div class="flex-1 space-y-1">
      <div class="flex items-center gap-2">
        <h3 class="text-slate-900 font-semibold">{{ product?.name }}</h3>
        <span class="ml-auto text-xs px-2 py-1 rounded-full bg-green-100 text-green-700" *ngIf="product?.featured">Destacado</span>
      </div>
      <p class="text-slate-600 text-sm">{{ product?.description }}</p>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-sm">
        <div>
          <div class="text-slate-500">Precio</div>
          <div class="text-emerald-600 font-semibold">$ {{ product?.price | number:'1.2-2' }} / {{ product?.unit }}</div>
        </div>
        <div>
          <div class="text-slate-500">Stock</div>
          <div>{{ product?.stock ?? '-' }} unidades</div>
        </div>
        <div>
          <div class="text-slate-500">Categoría</div>
          <div>{{ product?.category ?? '-' }}</div>
        </div>
        <div>
          <div class="text-slate-500">Ubicación</div>
          <div>{{ product?.location ?? '—' }}</div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-3">
        <button (click)="edit.emit(product?.id!)" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M16.862 4.487a1.875 1.875 0 1 1 2.651 2.651L7.128 19.523l-3.495.388a.75.75 0 0 1-.826-.826l.388-3.495L16.862 4.487Z"/><path d="M19.5 7.125 16.875 4.5"/></svg>
          Editar
        </button>
        <button (click)="remove.emit(product?.id!)" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path fill-rule="evenodd" d="M16.5 4.5v.75h3.75a.75.75 0 0 1 0 1.5h-.671l-.666 10.994A2.25 2.25 0 0 1 16.67 20.25H7.33a2.25 2.25 0 0 1-2.243-2.506L4.422 6.75H3.75a.75.75 0 0 1 0-1.5H7.5V4.5a2.25 2.25 0 0 1 2.25-2.25h4.5A2.25 2.25 0 0 1 16.5 4.5Zm-6 0v.75h3V4.5h-3Z" clip-rule="evenodd"/></svg>
          Eliminar
        </button>
      </div>
    </div>
  </article>
  `
})
export class SellerProductCardComponent {
  @Input() product?: SellerProduct;
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();
}
