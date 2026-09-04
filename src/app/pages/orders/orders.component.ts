import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../services/order.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string; step: number }> = {
  pending:   { label: 'Pendiente',   classes: 'bg-amber-50 text-amber-700 border-amber-200',  step: 1 },
  confirmed: { label: 'Confirmado',  classes: 'bg-blue-50 text-blue-700 border-blue-200',     step: 2 },
  shipped:   { label: 'En camino',   classes: 'bg-purple-50 text-purple-700 border-purple-200', step: 3 },
  delivered: { label: 'Entregado',   classes: 'bg-green-50 text-green-700 border-green-200',  step: 4 },
  cancelled: { label: 'Cancelado',   classes: 'bg-red-50 text-red-700 border-red-200',        step: 0 },
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-slate-900 mb-8">Mis Pedidos</h1>

    <!-- Skeleton -->
    <div *ngIf="loading()" class="space-y-4 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="bg-white rounded-xl h-32 border border-slate-200"></div>
    </div>

    <!-- Empty -->
    <div *ngIf="!loading() && orders().length === 0" class="flex flex-col items-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-8 w-8 text-slate-300">
          <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd"/>
          <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Z" clip-rule="evenodd"/>
        </svg>
      </div>
      <p class="text-slate-600 font-medium mb-1">Aún no has hecho pedidos</p>
      <p class="text-slate-400 text-sm mb-6">Cuando hagas una compra, aparecerá aquí.</p>
      <a routerLink="/" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-5 rounded-full transition text-sm">
        Explorar productos
      </a>
    </div>

    <!-- Orders list -->
    <div *ngIf="!loading() && orders().length > 0" class="space-y-4">
      <article *ngFor="let order of orders()"
        class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <span class="text-xs text-slate-400 font-mono">Orden</span>
            <p class="font-bold text-slate-900 font-mono">#{{ order.id }}</p>
          </div>
          <span [class]="'text-xs font-medium border px-2.5 py-1 rounded-full ' + statusCfg(order.status).classes">
            {{ statusCfg(order.status).label }}
          </span>
          <div class="text-right">
            <p class="text-xs text-slate-400">{{ order.createdAt | date:'d MMM, y' }}</p>
            <p class="font-bold text-brand-600">\${{ order.total | number:'1.2-2' }}</p>
          </div>
        </div>

        <!-- Progress bar -->
        <div *ngIf="order.status !== 'cancelled'" class="px-5 pt-4 pb-2">
          <div class="flex items-center gap-0">
            <ng-container *ngFor="let step of [1,2,3,4]; let last = last">
              <div class="flex flex-col items-center">
                <div [class]="'h-2.5 w-2.5 rounded-full transition-colors ' +
                  (statusCfg(order.status).step >= step ? 'bg-brand-500' : 'bg-slate-200')">
                </div>
              </div>
              <div *ngIf="!last" [class]="'flex-1 h-0.5 transition-colors ' +
                (statusCfg(order.status).step > step ? 'bg-brand-500' : 'bg-slate-200')"></div>
            </ng-container>
          </div>
          <div class="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>Pendiente</span><span>Confirmado</span><span>En camino</span><span>Entregado</span>
          </div>
        </div>

        <!-- Items preview -->
        <div class="px-5 py-3 flex gap-3 flex-wrap">
          <div *ngFor="let item of order.items.slice(0, 4)" class="flex items-center gap-2 text-sm text-slate-600">
            <img [src]="item.product.image" [alt]="item.product.name"
                 class="w-10 h-10 object-cover rounded-lg" />
            <span class="hidden sm:inline truncate max-w-[100px]">{{ item.product.name }}</span>
            <span class="text-slate-400 text-xs">×{{ item.quantity }}</span>
          </div>
          <span *ngIf="order.items.length > 4" class="text-xs text-slate-400 self-center">
            +{{ order.items.length - 4 }} más
          </span>
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
