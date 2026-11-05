import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { ProductCard } from '../product-card/product-card.component';

/** Compact product card for the chat: it only links to the detail, there is no add button on purpose */
@Component({
  selector: 'app-assistant-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a
      *ngIf="product"
      [id]="'assistant-product-' + product.id"
      class="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-2 no-underline transition hover:border-primary"
      [routerLink]="['/product', product.id]"
      (click)="opened.emit()"
    >
      <img
        [src]="product.image"
        [alt]="product.name"
        loading="lazy"
        class="h-14 w-14 flex-shrink-0 rounded-lg bg-surface-subtle object-cover"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-text-main">{{ product.name }}</span>
        <span class="block font-mono text-xs text-text-muted">
          Bs {{ product.price | number: '1.2-2' }}
          <ng-container *ngIf="product.unit"> / {{ product.unit }}</ng-container>
        </span>
        <span
          *ngIf="product.stock !== undefined"
          class="block text-xs"
          [ngClass]="product.stock > 0 ? 'text-text-subtle' : 'text-danger'"
        >
          {{ product.stock > 0 ? 'Stock: ' + product.stock : 'Agotado' }}
        </span>
      </span>
    </a>
  `,
})
export class AssistantProductCardComponent {
  @Input() product?: ProductCard;
  /** Fires when the link is followed, so the panel can get out of the way on small screens */
  @Output() opened = new EventEmitter<void>();
}
