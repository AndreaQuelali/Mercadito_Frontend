import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../services/order.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string; step: number }> = {
  pending:   { label: 'Pendiente',   classes: 'st-pending',  step: 1 },
  confirmed: { label: 'Confirmado',  classes: 'st-confirmed',     step: 2 },
  shipped:   { label: 'En camino',   classes: 'st-shipped', step: 3 },
  delivered: { label: 'Entregado',   classes: 'st-delivered',  step: 4 },
  cancelled: { label: 'Cancelado',   classes: 'st-cancelled',        step: 0 },
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-5xl">
    <h1 class="ui-title mb-8">Mis pedidos</h1>

    <div *ngIf="loading()" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-36"></div>
    </div>

    <div *ngIf="!loading() && orders().length === 0" class="ui-empty">
      <h2 class="ui-h2">Aún no has hecho pedidos</h2>
      <p class="text-lg text-text-muted">Cuando hagas una compra, aparecerá aquí.</p>
      <p><a routerLink="/products" class="ui-btn">Explorar productos</a></p>
    </div>

    <div *ngIf="!loading() && orders().length > 0" class="space-y-4">
      <article *ngFor="let order of orders()" class="ui-panel space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-text-muted">Orden</p>
            <p class="font-display text-2xl font-bold">#{{ order.id }}</p>
          </div>
          <span class="inline-block px-3 py-1 font-semibold" [ngClass]="statusCfg(order.status).classes">
            {{ statusCfg(order.status).label }}
          </span>
          <div class="text-right">
            <p class="text-text-muted">{{ order.createdAt | date:'d MMM, y' }}</p>
            <p class="text-xl font-bold">Bs {{ order.total | number:'1.2-2' }}</p>
          </div>
        </div>

        <div *ngIf="order.status !== 'cancelled'">
          <div class="grid grid-cols-4 gap-1" aria-hidden="true">
            <i *ngFor="let step of [1,2,3,4]" class="block h-2"
               [ngClass]="statusCfg(order.status).step >= step ? 'bg-primary' : 'bg-surface-hover'"></i>
          </div>
          <div class="grid grid-cols-4 mt-2 text-sm text-text-muted">
            <span>Pendiente</span><span>Confirmado</span><span>En camino</span><span>Entregado</span>
          </div>
        </div>

        <div class="flex gap-4 flex-wrap items-center">
          <div *ngFor="let item of order.items.slice(0, 4)" class="flex items-center gap-3">
            <img [src]="item.product.image" [alt]="item.product.name" class="w-12 h-12 object-cover" />
            <span class="hidden sm:inline">{{ item.product.name }}</span>
            <span class="text-text-muted">×{{ item.quantity }}</span>
          </div>
          <span *ngIf="order.items.length > 4" class="text-text-muted">+{{ order.items.length - 4 }} más</span>
        </div>
      </article>
    </div>
  </main>
  `
})
export class OrdersComponent implements OnInit {
  private orderSvc = inject(OrderService);
  orders = signal<Order[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.orderSvc.listMine().subscribe({
      next: (orders) => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusCfg(s: OrderStatus) { return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending; }
}
