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
      class="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius)] border border-border-subtle bg-base py-2 pl-2 pr-3 no-underline transition hover:bg-surface-subtle"
      [routerLink]="['/product', product.id]"
      (click)="opened.emit()"
    >
      <img
        [src]="product.image"
        [alt]="product.name"
        loading="lazy"
        class="h-[52px] w-[52px] rounded-[var(--radius)] bg-surface-hover object-cover"
      />
      <span class="flex min-w-0 flex-col leading-snug">
        <span class="truncate font-display text-[16px] font-bold text-text-main">{{ product.name }}</span>
        <span class="text-sm text-text-main">
          <strong class="font-bold">Bs {{ product.price | number: '1.2-2' }}</strong>
          <span *ngIf="product.unit" class="text-text-muted"> por {{ product.unit }}</span>
        </span>
        <span
          *ngIf="product.stock !== undefined"
          class="text-[13px]"
          [ngClass]="product.stock > 0 ? 'text-text-muted' : 'text-danger'"
        >
          {{ product.stock > 0 ? product.stock + ' disponibles' : 'Agotado' }}
        </span>
      </span>
      <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] text-text-muted" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </a>
  `,
})
export class AssistantProductCardComponent {
  @Input() product?: ProductCard;
  /** Fires when the link is followed, so the panel can get out of the way on small screens */
  @Output() opened = new EventEmitter<void>();
}
