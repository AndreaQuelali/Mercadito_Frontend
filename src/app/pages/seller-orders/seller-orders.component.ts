import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  pending:   { label: 'Pendiente',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado',  classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  shipped:   { label: 'En camino',   classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  delivered: { label: 'Entregado',   classes: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado',   classes: 'bg-red-50 text-red-700 border-red-200' },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Confirmar',
  confirmed: 'Marcar en camino',
  shipped: 'Marcar entregado',
  delivered: '',
  cancelled: '',
};

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Órdenes de mi tienda</h1>
        <p class="text-slate-500 text-sm mt-1">Gestiona el estado de los pedidos de tus clientes.</p>
      </div>
      <a routerLink="/seller" class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>
        </svg>
        Panel de vendedor
      </a>
    </div>

    <!-- Skeleton -->
    <div *ngIf="loading()" class="space-y-4 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="bg-white rounded-xl h-36 border border-slate-200"></div>
    </div>

    <!-- Empty -->
    <div *ngIf="!loading() && orders().length === 0"
         class="flex flex-col items-center py-20 text-center">
      <p class="text-slate-500">Aún no has recibido pedidos.</p>
    </div>

    <!-- Orders -->
    <div *ngIf="!loading() && orders().length > 0" class="space-y-4">
      <article *ngFor="let order of orders()"
        class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3 flex-wrap">
          <div>
            <span class="text-xs text-slate-400 font-mono">Orden</span>
            <p class="font-bold text-slate-900 font-mono text-lg">#{{ order.id }}</p>
            <p class="text-xs text-slate-400 mt-0.5">{{ order.createdAt | date:'d MMM y, HH:mm' }}</p>
          </div>

          <span [class]="'text-xs font-medium border px-3 py-1 rounded-full ' + statusCfg(order.status).classes">
            {{ statusCfg(order.status).label }}
          </span>

          <div class="text-right">
            <p class="text-xs text-slate-400">Total</p>
            <p class="font-bold text-brand-600 text-lg">\${{ order.total | number:'1.2-2' }}</p>
          </div>

          <!-- Advance status button -->
          <button
            *ngIf="nextStatus(order.status)"
            (click)="advanceStatus(order)"
            [disabled]="updating() === order.id"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            <span *ngIf="updating() === order.id" class="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ nextStatusLabel(order.status) }}
          </button>
        </div>

        <!-- Items -->
        <div class="px-5 py-3 flex gap-3 flex-wrap">
          <div *ngFor="let item of order.items" class="flex items-center gap-2 text-sm text-slate-600">
            <img [src]="item.product.image" [alt]="item.product.name"
                 class="w-10 h-10 object-cover rounded-lg" />
            <span class="hidden sm:inline max-w-[100px] truncate">{{ item.product.name }}</span>
            <span class="text-slate-400 text-xs">×{{ item.quantity }}</span>
            <span class="text-slate-500 text-xs">\${{ item.unitPrice | number:'1.2-2' }}</span>
          </div>
        </div>
      </article>
    </div>
  </main>
  `
})
export class SellerOrdersComponent implements OnInit {
  private orderSvc = inject(OrderService);
  private toast = inject(ToastService);
  orders = signal<Order[]>([]);
  loading = signal(true);
  updating = signal<number | null>(null);

  ngOnInit(): void {
    this.orderSvc.listSeller().subscribe({
      next: (orders) => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusCfg(s: OrderStatus) { return STATUS_CONFIG[s]; }
  nextStatus(s: OrderStatus): OrderStatus | null { return NEXT_STATUS[s]; }
  nextStatusLabel(s: OrderStatus): string { return NEXT_STATUS_LABEL[s]; }

  advanceStatus(order: Order): void {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    this.updating.set(order.id);
    this.orderSvc.updateStatus(order.id, next).subscribe({
      next: (updated) => {
        this.orders.update((list) =>
          list.map((o) => (o.id === updated.id ? updated : o))
        );
        this.toast.success(`Orden #${order.id} actualizada a "${STATUS_CONFIG[next].label}"`);
        this.updating.set(null);
      },
      error: () => {
        this.toast.error('No se pudo actualizar el estado de la orden');
        this.updating.set(null);
      },
    });
  }
}
