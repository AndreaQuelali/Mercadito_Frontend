import { Component, OnInit, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderHistoryComponent } from '../../components/order-history/order-history.component';
import { OrderService, Order, OrderStatus, SELLER_CAN_CANCEL } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  pending:   { label: 'Pendiente',   classes: 'st-pending' },
  paid:      { label: 'Pagado',      classes: 'st-confirmed' },
  confirmed: { label: 'Confirmado',  classes: 'st-confirmed' },
  shipped:   { label: 'En camino',   classes: 'st-shipped' },
  delivered: { label: 'Entregado',   classes: 'st-delivered' },
  cancelled: { label: 'Cancelado',   classes: 'st-cancelled' },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  paid: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Confirmar',
  paid: 'Confirmar',
  confirmed: 'Marcar en camino',
  shipped: 'Marcar entregado',
  delivered: '',
  cancelled: '',
};

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, FormsModule, RouterLink, OrderHistoryComponent],
  template: `
  <main class="ui-page max-w-5xl">
    <header class="space-y-3 mb-8">
      <h1 class="ui-title">Pedidos</h1>
      <p class="ui-lead">Gestiona el estado de los pedidos de tu puesto y mira cómo entregarlos.</p>
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
            <p *ngIf="order.user" class="text-text-muted">{{ order.user.firstName }} {{ order.user.lastName }}</p>
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
          <button
            *ngIf="auth.canManageStore() && canCancel(order)"
            type="button" class="ui-btn ui-btn-sm ui-btn-danger" [id]="'cancel-order-' + order.id"
            (click)="cancelling.set(order.id)"
          >Cancelar</button>
        </div>

        <form *ngIf="cancelling() === order.id" class="ui-panel space-y-2" (ngSubmit)="cancelOrder(order)" novalidate>
          <label [for]="'cancel-reason-' + order.id" class="ui-label">Motivo de la cancelación (obligatorio)</label>
          <input [id]="'cancel-reason-' + order.id" name="cancelReason" type="text" maxlength="300" class="ui-field"
                 [ngModel]="cancelReason()" (ngModelChange)="cancelReason.set($event)" />
          <p class="text-text-muted">El stock de los productos vuelve al inventario y el comprador recibe el motivo.</p>
          <div class="flex gap-2">
            <button type="submit" class="ui-btn ui-btn-sm ui-btn-danger" [disabled]="!cancelReason().trim() || updating() === order.id">Cancelar pedido</button>
            <button type="button" class="ui-btn ui-btn-sm ui-btn-ghost" (click)="cancelling.set(null)">Volver</button>
          </div>
        </form>

        <div class="ui-panel space-y-1" [attr.data-fulfillment]="order.fulfillment">
          <p class="font-semibold">{{ order.fulfillment === 'delivery' ? 'Entrega a domicilio' : 'Retira en el puesto' }}</p>
          <p *ngIf="order.fulfillment === 'delivery'">{{ order.address }}<span *ngIf="order.addressRef"> — {{ order.addressRef }}</span></p>
          <p>Teléfono: <a [href]="'tel:' + order.contactPhone" class="underline">{{ order.contactPhone }}</a></p>
          <p *ngIf="order.note" class="text-text-muted">Nota: {{ order.note }}</p>
        </div>

        <div class="ui-panel space-y-3" [attr.data-payment]="order.paymentStatus">
          <p class="font-semibold">
            {{ order.paymentMethod === 'qr_transfer' ? 'QR o transferencia' : 'Pago contra entrega' }}
            · {{ paymentLabel(order) }}
          </p>
          <p *ngIf="order.paymentMethod === 'qr_transfer' && order.paymentProofUrl">
            <a [href]="order.paymentProofUrl" target="_blank" rel="noopener" class="ui-link">Ver comprobante</a>
            <span class="text-text-muted block">Esperado: Bs {{ order.total | number:'1.2-2' }} · pedido del {{ order.createdAt | date:'d MMM y, HH:mm' }}. Verifica el pago en tu banco antes de confirmar.</span>
          </p>
          <p *ngIf="order.paymentStatus === 'rejected' && order.paymentRejectReason" class="text-text-muted">Motivo del rechazo: {{ order.paymentRejectReason }}</p>

          <div *ngIf="auth.canManageStore()" class="flex flex-wrap gap-2">
            <button *ngIf="canCollect(order)" type="button" class="ui-btn ui-btn-sm" id="collect-{{ order.id }}"
                    [disabled]="updating() === order.id" (click)="confirmPayment(order)">Marcar cobrado</button>
            <button *ngIf="order.paymentStatus === 'proof_uploaded'" type="button" class="ui-btn ui-btn-sm" id="confirm-pay-{{ order.id }}"
                    [disabled]="updating() === order.id" (click)="confirmPayment(order)">Confirmar pago</button>
            <button *ngIf="order.paymentStatus === 'proof_uploaded'" type="button" class="ui-btn ui-btn-sm ui-btn-danger" id="reject-pay-{{ order.id }}"
                    (click)="rejecting.set(order.id)">Rechazar</button>
          </div>

          <form *ngIf="rejecting() === order.id" class="space-y-2" (ngSubmit)="rejectPayment(order)" novalidate>
            <label [for]="'reject-reason-' + order.id" class="ui-label">Motivo del rechazo</label>
            <input [id]="'reject-reason-' + order.id" name="reason" type="text" maxlength="300" class="ui-field"
                   [ngModel]="reason()" (ngModelChange)="reason.set($event)" placeholder="El monto no coincide…" />
            <div class="flex gap-2">
              <button type="submit" class="ui-btn ui-btn-sm" [disabled]="!reason().trim() || updating() === order.id">Enviar rechazo</button>
              <button type="button" class="ui-btn ui-btn-sm ui-btn-ghost" (click)="rejecting.set(null)">Cancelar</button>
            </div>
          </form>
        </div>

        <app-order-history [events]="order.events ?? []"></app-order-history>

        <div class="flex gap-4 flex-wrap items-center">
          <div *ngFor="let item of order.items" class="flex items-center gap-3">
            <img [src]="item.product.image" [alt]="item.product.name" class="w-12 h-12 object-cover" />
            <span class="hidden sm:inline">{{ item.product.name }}</span>
            <span class="text-text-muted">×{{ item.quantity }}</span>
            <span class="text-text-muted">Bs {{ item.price | number:'1.2-2' }}</span>
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
  rejecting = signal<number | null>(null);
  cancelling = signal<number | null>(null);
  cancelReason = signal('');
  reason = signal('');

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

  paymentLabel(o: Order): string {
    return { unpaid: 'sin pagar', proof_uploaded: 'comprobante por revisar', paid: 'pagado', rejected: 'comprobante rechazado' }[o.paymentStatus];
  }

  /** Cash is collected by the seller when delivering; QR orders wait for a proof instead. */
  canCollect(o: Order): boolean {
    return this.auth.canManageStore() && o.paymentMethod === 'cash_on_delivery'
      && o.paymentStatus === 'unpaid' && o.status !== 'cancelled';
  }

  private replace(updated: Order): void {
    // The PATCH answer keeps the order shape but not the buyer: keep what the list already shows
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated, user: o.user } : o)));
  }

  canCancel(o: Order): boolean { return SELLER_CAN_CANCEL.includes(o.status); }

  cancelOrder(order: Order): void {
    const reason = this.cancelReason().trim();
    if (!reason) return;
    this.updating.set(order.id);
    this.orderSvc.updateStatus(order.id, 'cancelled', reason).subscribe({
      next: (updated) => {
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated, user: o.user, events: undefined } : o)));
        // The PATCH answer has no history: reload the list so the new event shows up
        this.orderSvc.listSeller().subscribe((orders) => this.orders.set(orders));
        this.toast.success(`Orden #${order.id} cancelada`);
        this.cancelling.set(null);
        this.cancelReason.set('');
        this.updating.set(null);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'No se pudo cancelar el pedido');
        this.updating.set(null);
      },
    });
  }

  confirmPayment(order: Order): void {
    this.updating.set(order.id);
    this.orderSvc.updatePayment(order.id, 'confirm').subscribe({
      next: (updated) => { this.replace(updated); this.toast.success(`Pago de la orden #${order.id} confirmado`); this.updating.set(null); },
      error: () => { this.toast.error('No se pudo confirmar el pago'); this.updating.set(null); },
    });
  }

  rejectPayment(order: Order): void {
    const reason = this.reason().trim();
    if (!reason) return;
    this.updating.set(order.id);
    this.orderSvc.updatePayment(order.id, 'reject', reason).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.toast.success(`Comprobante de la orden #${order.id} rechazado`);
        this.rejecting.set(null);
        this.reason.set('');
        this.updating.set(null);
      },
      error: () => { this.toast.error('No se pudo rechazar el comprobante'); this.updating.set(null); },
    });
  }

  advanceStatus(order: Order): void {
    if (!this.auth.canManageStore()) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    this.updating.set(order.id);
    this.orderSvc.updateStatus(order.id, next).subscribe({
      next: (updated) => {
        this.orders.update((list) =>
          list.map((o) => (o.id === updated.id ? { ...o, ...updated, user: o.user, events: o.events } : o))
        );
        this.orderSvc.listSeller().subscribe((orders) => this.orders.set(orders));
        this.toast.success(`Orden #${order.id} actualizada a "${STATUS_CONFIG[next].label}"`);
        this.updating.set(null);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'No se pudo actualizar el estado de la orden');
        this.updating.set(null);
      },
    });
  }
}
