import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
  <mat-card class="rounded-xl overflow-hidden shadow-card">
    <div class="aspect-[4/3] overflow-hidden">
      <img [src]="product?.image" [alt]="product?.name" class="w-full h-full object-cover" />
    </div>
    <mat-card-content class="p-4 flex flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-slate-900 font-semibold">{{ product?.name }}</h3>
        <span *ngIf="product?.featured" class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Destacado</span>
      </div>
      <p class="text-sm text-slate-600 line-clamp-2">{{ product?.description }}</p>
      <div *ngIf="product?.location || product?.seller" class="text-xs text-slate-500 space-y-1">
        <div *ngIf="product?.location" class="inline-flex items-center gap-1">
          <mat-icon color="primary" class="!text-base">place</mat-icon>
          {{ product?.location }}
        </div>
        <div *ngIf="product?.seller">Vendedor: {{ product?.seller }}</div>
      </div>
      <div class="flex items-center justify-between pt-2">
        <div>
          <div class="text-emerald-600 font-semibold">$ {{ product?.price | number:'1.2-2' }}</div>
          <div class="text-xs text-slate-500">por {{ product?.unit }}</div>
        </div>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon>
          Agregar
        </button>
      </div>
    </mat-card-content>
  </mat-card>
  `
})
export class ProductCardComponent {
  @Input() product?: ProductCard;
}
