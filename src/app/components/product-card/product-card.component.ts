import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProductCard = {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  featured?: boolean;
  seller?: string;
  location?: string;
};

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
  <article class="bg-white rounded-xl shadow-card overflow-hidden flex flex-col">
    <div class="aspect-[4/3] overflow-hidden">
      <img [src]="product?.image" [alt]="product?.name" class="w-full h-full object-cover" />
    </div>
    <div class="p-4 flex flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-slate-900 font-semibold">{{ product?.name }}</h3>
        <span *ngIf="product?.featured" class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Destacado</span>
      </div>
      <p class="text-sm text-slate-600 line-clamp-2">{{ product?.description }}</p>
      <div *ngIf="product?.location || product?.seller" class="text-xs text-slate-500 space-y-1">
        <div *ngIf="product?.location" class="inline-flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 text-brand-600"><path fill-rule="evenodd" d="M11.998 2.25c-4.28 0-7.748 3.468-7.748 7.748 0 5.109 6.523 10.73 7.02 11.141a1.125 1.125 0 0 0 1.458 0c.496-.41 7.02-6.032 7.02-11.141 0-4.28-3.468-7.748-7.75-7.748Zm0 10.123a2.375 2.375 0 1 1 0-4.75 2.375 2.375 0 0 1 0 4.75Z" clip-rule="evenodd"/></svg>
          {{ product?.location }}
        </div>
        <div *ngIf="product?.seller">Vendedor: {{ product?.seller }}</div>
      </div>
      <div class="flex items-center justify-between pt-2">
        <div>
          <div class="text-emerald-600 font-semibold">$ {{ product?.price | number:'1.2-2' }}</div>
          <div class="text-xs text-slate-500">por {{ product?.unit }}</div>
        </div>
        <button class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path fill-rule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z" clip-rule="evenodd"/></svg>
          Agregar
        </button>
      </div>
    </div>
  </article>
  `
})
export class ProductCardComponent {
  @Input() product?: ProductCard;
}
