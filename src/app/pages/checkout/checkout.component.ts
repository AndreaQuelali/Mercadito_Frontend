import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-3xl">
    <div *ngIf="orderId()" class="space-y-6 py-8">
      <h1 class="ui-title">¡Pedido confirmado!</h1>
      <p class="ui-lead">Tu pedido fue creado. Coordina el retiro o la entrega con el puesto.</p>
      <p class="ui-panel inline-block text-xl font-semibold">Orden #{{ orderId() }}</p>
      <div class="flex flex-wrap gap-3">
        <a routerLink="/orders" class="ui-btn">Ver mis pedidos</a>
        <a routerLink="/products" class="ui-btn ui-btn-ghost">Seguir comprando</a>
      </div>
    </div>

    <div *ngIf="!orderId()" class="space-y-8">
      <h1 class="ui-title">Confirmar pedido</h1>

      <div *ngIf="cart.items().length === 0" class="ui-empty">
        <p class="text-lg">Tu carrito está vacío.</p>
        <p><a routerLink="/products" class="ui-btn">Explorar productos</a></p>
      </div>

      <div *ngIf="cart.items().length > 0" class="space-y-6">
        <div class="ui-panel space-y-5">
          <h2 class="ui-h2">Resumen del pedido</h2>
          <ul class="space-y-4">
            <li *ngFor="let item of cart.items()" class="flex items-center gap-4">
              <img [src]="item.product.image" [alt]="item.product.name" class="w-16 h-16 object-cover shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-lg">{{ item.product.name }}</p>
                <p class="text-text-muted">{{ item.quantity }} × Bs {{ item.product.price | number:'1.2-2' }}</p>
              </div>
              <span class="text-lg font-bold">Bs {{ (item.quantity * item.product.price) | number:'1.2-2' }}</span>
            </li>
          </ul>
          <p class="flex justify-between items-baseline text-2xl font-bold pt-4 border-t-4 border-dotted border-text-main">
            <span>Total</span>
            <span>Bs {{ cart.total() | number:'1.2-2' }}</span>
          </p>
        </div>

        <p *ngIf="errorMsg()" class="ui-alert-error" role="alert">{{ errorMsg() }}</p>

        <div class="flex flex-wrap gap-3">
          <button id="checkout-confirm" type="button" (click)="placeOrder()" [disabled]="placing()" class="ui-btn flex-1 sm:flex-none">
            <span *ngIf="placing()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Confirmar pedido
          </button>
          <a routerLink="/cart" class="ui-btn ui-btn-ghost">Volver al carrito</a>
        </div>
      </div>
    </div>
  </main>
  `
})
export class CheckoutComponent implements OnInit {
  cart = inject(CartService);
  private router = inject(Router);
  private toast = inject(ToastService);

  orderId = signal<number | null>(null);
  placing = signal(false);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.cart.load().subscribe();
  }

  placeOrder(): void {
    this.placing.set(true);
    this.errorMsg.set(null);
    this.cart.checkout().subscribe({
      next: (res) => {
        this.orderId.set(res.orderId);
        this.placing.set(false);
        this.toast.success('¡Pedido realizado exitosamente!');
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'No se pudo procesar el pedido. Intenta nuevamente.');
        this.placing.set(false);
      },
    });
  }
}
