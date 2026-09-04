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
  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

    <!-- Success state -->
    <div *ngIf="orderId()" class="flex flex-col items-center text-center py-12">
      <div class="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-10 w-10 text-brand-600">
          <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/>
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-slate-900 mb-2">¡Pedido confirmado!</h1>
      <p class="text-slate-500 mb-2">Tu pedido fue creado exitosamente.</p>
      <p class="text-sm font-mono bg-slate-100 text-slate-700 px-4 py-2 rounded-lg mb-8">
        Orden #{{ orderId() }}
      </p>
      <div class="flex gap-3">
        <a routerLink="/orders" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-6 rounded-full transition">
          Ver mis pedidos
        </a>
        <a routerLink="/" class="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-6 rounded-full transition">
          Seguir comprando
        </a>
      </div>
    </div>

    <!-- Checkout form -->
    <div *ngIf="!orderId()">
      <h1 class="text-2xl font-bold text-slate-900 mb-8">Confirmar pedido</h1>

      <div *ngIf="cart.items().length === 0" class="text-slate-500 py-12 text-center">
        Tu carrito está vacío.
        <a routerLink="/" class="text-brand-600 hover:underline block mt-2">Explorar productos</a>
      </div>

      <div *ngIf="cart.items().length > 0" class="space-y-6">
        <!-- Order summary -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 class="font-semibold text-slate-900 mb-4">Resumen del pedido</h2>
          <div class="space-y-3">
            <div *ngFor="let item of cart.items()" class="flex items-center gap-4">
              <img [src]="item.product.image" [alt]="item.product.name"
                   class="w-14 h-14 object-cover rounded-lg shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-900 truncate">{{ item.product.name }}</p>
                <p class="text-sm text-slate-500">{{ item.quantity }} × \${{ item.product.price | number:'1.2-2' }}</p>
              </div>
              <span class="font-semibold text-slate-900">\${{ (item.quantity * item.product.price) | number:'1.2-2' }}</span>
            </div>
          </div>
          <hr class="my-4 border-slate-100">
          <div class="flex justify-between text-lg font-bold text-slate-900">
            <span>Total</span>
            <span class="text-brand-600">\${{ cart.total() | number:'1.2-2' }}</span>
          </div>
        </div>

        <div *ngIf="errorMsg()" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {{ errorMsg() }}
        </div>

        <div class="flex gap-3">
          <button
            (click)="placeOrder()"
            [disabled]="placing()"
            class="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-full transition disabled:opacity-50"
          >
            <span *ngIf="placing()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Confirmar pedido
          </button>
          <a routerLink="/cart" class="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-full transition">
            Volver al carrito
          </a>
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
