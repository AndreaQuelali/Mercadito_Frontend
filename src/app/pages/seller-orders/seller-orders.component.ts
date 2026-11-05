import { Component, OnInit, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  pending:   { label: 'Pendiente',   classes: 'st-pending' },
  confirmed: { label: 'Confirmado',  classes: 'st-confirmed' },
  shipped:   { label: 'En camino',   classes: 'st-shipped' },
  delivered: { label: 'Entregado',   classes: 'st-delivered' },
  cancelled: { label: 'Cancelado',   classes: 'st-cancelled' },
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
  imports: [UiEmptyComponent, CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-5xl">
    <header class="space-y-3 mb-8">
      <h1 class="ui-title">Pedidos</h1>
      <p class="ui-lead">Gestiona el estado de los pedidos de tus clientes.</p>
    </header>

    <p *ngIf="!auth.canManageStore()" class="ui-alert-warn mb-6">
      Tu puesto está suspendido. Puedes ver las órdenes, pero no cambiar su estado.
    </p>

    <div *ngIf="loading()" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-36"></div>
    </div>

    <ui-empty *ngIf="!loading() && orders().length === 0" icon="orders" title="Aún no recibes pedidos" text="Cuando un cliente compre en tu puesto, lo verás aquí."></ui-empty>

    <div *ngIf="!loading() && orders().length > 0" class="space-y-4">
      <article *ngFor="let order of orders()" class="ui-panel space-y-5">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p class="text-text-muted">Orden</p>
            <p class="font-display text-2xl font-bold">#{{ order.id }}</p>
            <p class="text-text-muted">{{ order.createdAt | date:'d MMM y, HH:mm' }}</p>
          </div>

          <span class="inline-block px-3 py-1 font-semibold" [ngClass]="statusCfg(order.status).classes">
            {{ statusCfg(order.status).label }}
          </span>

          <div class="text-right">
            <p class="text-text-muted">Total</p>
            <p class="text-xl font-bold">Bs {{ order.total | number:'1.2-2' }}</p>
          </div>

          <button
            *ngIf="auth.canManageStore() && nextStatus(order.status)"
            type="button"
            (click)="advanceStatus(order)"
            [disabled]="updating() === order.id"
            class="ui-btn ui-btn-sm"
          >
            <span *ngIf="updating() === order.id" class="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            {{ nextStatusLabel(order.status) }}
          </button>
        </div>

        <div class="flex gap-4 flex-wrap items-center">
          <div *ngFor="let item of order.items" class="flex items-center gap-3">
            <img [src]="item.product.image" [alt]="item.product.name" class="w-12 h-12 object-cover" />
            <span class="hidden sm:inline">{{ item.product.name }}</span>
            <span class="text-text-muted">×{{ item.quantity }}</span>
            <span class="text-text-muted">Bs {{ item.unitPrice | number:'1.2-2' }}</span>
          </div>
        </div>
      </article>
    </div>
  </main>
  `
})
export class SellerOrdersComponent implements OnInit {
  private orderSvc = inject(OrderService);
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  orders = signal<Order[]>([]);
  loading = signal(true);
  updating = signal<number | null>(null);

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({ error: () => undefined });
    this.orderSvc.listSeller().subscribe({
      next: (orders) => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusCfg(s: OrderStatus) { return STATUS_CONFIG[s]; }
  nextStatus(s: OrderStatus): OrderStatus | null { return NEXT_STATUS[s]; }
  nextStatusLabel(s: OrderStatus): string { return NEXT_STATUS_LABEL[s]; }

  advanceStatus(order: Order): void {
    if (!this.auth.canManageStore()) return;
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
