import { Component, OnInit, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Order, OrderService, OrderStatus, PaymentStatus, Purchase } from '../../services/order.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string; step: number }> = {
  pending:   { label: 'Pendiente',   classes: 'st-pending',  step: 1 },
  paid:      { label: 'Pagado',      classes: 'st-confirmed', step: 1 },
  confirmed: { label: 'Confirmado',  classes: 'st-confirmed',     step: 2 },
  shipped:   { label: 'En camino',   classes: 'st-shipped', step: 3 },
  delivered: { label: 'Entregado',   classes: 'st-delivered',  step: 4 },
  cancelled: { label: 'Cancelado',   classes: 'st-cancelled',        step: 0 },
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-5xl">
    <h1 class="ui-title mb-8">Mis pedidos</h1>

    <div *ngIf="loading()" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-36"></div>
    </div>

    <ui-empty *ngIf="!loading() && !failed() && purchases().length === 0" icon="orders" title="Aún no has hecho pedidos" text="Cuando hagas una compra, aparecerá aquí.">
      <a routerLink="/products" class="ui-btn">Explorar productos</a>
    </ui-empty>

    <p *ngIf="!loading() && failed()" class="ui-alert-error" role="alert">No pudimos cargar tus pedidos. Intenta de nuevo más tarde.</p>

    <div *ngIf="!loading() && purchases().length > 0" class="space-y-8">
      <section *ngFor="let purchase of purchases()" class="space-y-4" [attr.data-checkout]="purchase.checkoutId">
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="ui-h2">Compra del {{ purchase.createdAt | date:'d MMM, y' }}</h2>
          <p class="text-text-muted">
            {{ purchase.fulfillment === 'delivery' ? 'Entrega a domicilio' : 'Retiro en el puesto' }}
            · {{ purchase.orders.length }} {{ purchase.orders.length === 1 ? 'pedido' : 'pedidos' }}
            · Bs {{ purchase.total | number:'1.2-2' }}
          </p>
        </header>
      <article *ngFor="let order of purchase.orders" class="ui-panel space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-text-muted">{{ order.seller?.businessName || 'Puesto' }}</p>
            <p class="font-display text-2xl font-bold">Orden #{{ order.id }}</p>
          </div>
          <span class="inline-block px-3 py-1 font-semibold" [ngClass]="statusCfg(order.status).classes">
            {{ statusCfg(order.status).label }}
          </span>
          <div class="text-right">
            <p class="text-text-muted">{{ order.createdAt | date:'d MMM, y' }}</p>
            <p class="text-xl font-bold">Bs {{ order.total | number:'1.2-2' }}</p>
          </div>
        </div>

        <p class="flex flex-wrap items-center gap-3" [attr.data-payment]="order.paymentStatus">
          <span class="font-semibold">{{ paymentLabel(order) }}</span>
          <a *ngIf="order.paymentMethod === 'qr_transfer' && order.paymentStatus !== 'paid' && order.status !== 'cancelled'"
             [routerLink]="['/orders', order.id, 'pay']" class="ui-btn ui-btn-sm">
            {{ order.paymentStatus === 'unpaid' ? 'Pagar' : order.paymentStatus === 'rejected' ? 'Subir otro comprobante' : 'Ver pago' }}
          </a>
        </p>

        <p class="text-text-muted">
          <ng-container *ngIf="order.fulfillment === 'delivery'; else pickup">
            Entrega en: {{ order.address }}<span *ngIf="order.addressRef"> ({{ order.addressRef }})</span>
          </ng-container>
          <ng-template #pickup>Retiro en: {{ order.seller?.location || 'el puesto' }}</ng-template>
        </p>

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
      </section>
    </div>
  </main>
  `
})
export class OrdersComponent implements OnInit {
  private orderSvc = inject(OrderService);
  purchases = signal<Purchase[]>([]);
  loading = signal(true);
  failed = signal(false);

  ngOnInit(): void {
    this.orderSvc.listMine().subscribe({
      next: (purchases) => { this.purchases.set(purchases); this.loading.set(false); },
      // The API answers 400 when the user has no orders yet: that is the empty state, not a failure
      error: (err) => { this.failed.set(err?.status >= 500 || err?.status === 0); this.loading.set(false); },
    });
  }

  paymentLabel(o: Order): string {
    const labels: Record<PaymentStatus, string> = {
      unpaid: o.paymentMethod === 'qr_transfer' ? 'Pago pendiente (QR o transferencia)' : 'Pago contra entrega',
      proof_uploaded: 'Comprobante enviado, esperando al puesto',
      paid: 'Pago confirmado',
      rejected: 'Comprobante rechazado' + (o.paymentRejectReason ? ': ' + o.paymentRejectReason : ''),
    };
    return labels[o.paymentStatus];
  }

  statusCfg(s: OrderStatus) { return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending; }
}
