import { Component, OnInit, inject } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-6xl">
    <h1 class="ui-title mb-8">Mi carrito</h1>

    <ui-empty *ngIf="cart.items().length === 0 && !loading" icon="cart" title="Tu carrito está vacío" text="Explora el catálogo y agrega lo que necesites de los puestos.">
      <a routerLink="/products" class="ui-btn">Explorar productos</a>
    </ui-empty>

    <div *ngIf="loading" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-28"></div>
    </div>

    <div *ngIf="cart.items().length > 0 && !loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-3">
        <article *ngFor="let item of cart.items()" class="ui-panel flex flex-wrap sm:flex-nowrap gap-4 items-center !p-4">
          <img [src]="item.product.image" [alt]="item.product.name" class="w-24 h-24 object-cover shrink-0" />
          <div class="flex-1 min-w-[10rem]">
            <h3 class="font-display text-xl font-bold leading-tight">{{ item.product.name }}</h3>
            <p class="text-text-muted mt-1">Bs {{ item.product.price | number:'1.2-2' }} / {{ item.product.unit }}</p>
          </div>

          <div class="ui-qty !bg-surface" role="group" [attr.aria-label]="'Cantidad de ' + item.product.name">
            <button type="button" (click)="changeQty(item.id, item.quantity - 1)" aria-label="Quitar una unidad">−</button>
            <output>{{ item.quantity }}</output>
            <button type="button" (click)="changeQty(item.id, item.quantity + 1)" [disabled]="item.quantity >= item.product.stock" aria-label="Agregar una unidad">+</button>
          </div>

          <div class="text-right shrink-0 min-w-[6rem]">
            <p class="text-lg font-bold">Bs {{ (item.quantity * item.product.price) | number:'1.2-2' }}</p>
            <button type="button" (click)="removeItem(item.id)" class="text-danger font-semibold underline underline-offset-4 min-h-[44px]">Eliminar</button>
          </div>
        </article>
      </div>

      <aside class="lg:col-span-1">
        <div class="ui-panel lg:sticky lg:top-28 space-y-5">
          <h2 class="ui-h2">Resumen</h2>
          <ul class="space-y-2 text-base">
            <li *ngFor="let item of cart.items()" class="flex justify-between gap-3">
              <span>{{ item.product.name }} × {{ item.quantity }}</span>
              <span class="shrink-0">Bs {{ (item.quantity * item.product.price) | number:'1.2-2' }}</span>
            </li>
          </ul>
          <p class="flex justify-between items-baseline text-2xl font-bold pt-4 border-t-4 border-dotted border-text-main">
            <span>Total</span>
            <span>Bs {{ cart.total() | number:'1.2-2' }}</span>
          </p>
          <a id="cart-checkout" routerLink="/checkout" class="ui-btn w-full">Proceder al pago</a>
          <p class="text-center"><a routerLink="/products" class="ui-link">Seguir comprando</a></p>
        </div>
      </aside>
    </div>
  </main>
  `
})
export class CartComponent implements OnInit {
  cart = inject(CartService);
  private toast = inject(ToastService);
  loading = true;

  ngOnInit(): void {
    this.cart.load().subscribe({
      next: () => this.loading = false,
      error: () => this.loading = false,
    });
  }

  changeQty(itemId: number, newQty: number): void {
    if (newQty <= 0) { this.removeItem(itemId); return; }
    this.cart.updateItem(itemId, newQty).subscribe({
      error: () => this.toast.error('No se pudo actualizar la cantidad'),
    });
  }

  removeItem(itemId: number): void {
    this.cart.removeItem(itemId).subscribe({
      error: () => this.toast.error('No se pudo eliminar el producto'),
    });
  }
}
